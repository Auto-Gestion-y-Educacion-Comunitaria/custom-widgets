#!/usr/bin/env python3
"""Clean up InDesign-exported HTML and CSS for human readability.

Usage: python cleanup.py [base_dir] [out_dir]
Output: output/html/publication.html and output/css/idGeneratedStyles.css
"""

import html as htmlmod
import os
import sys
import re
from pathlib import Path


def _to_pascal_case(name):
    parts = re.split(r'[\s_-]+', name)
    return ''.join(p.capitalize() for p in parts if p)


def _content_to_name(content, state):
    img_m = re.search(r'<img[^>]*src="([^"]+)"', content)
    if img_m:
        src = img_m.group(1)
        if not src.startswith('data:'):
            fname = src.rstrip('/\\').split('/')[-1].split('\\')[-1]
            return _to_pascal_case(Path(fname).stem)
        state[0] += 1
        return f'Grafico{state[0]}'

    text = re.sub(r'<[^>]+>', ' ', content)
    text = re.sub(r'\s+', ' ', text).strip()
    text = htmlmod.unescape(text)

    if not text:
        return None

    pm = re.search(r'<<([^>]+)>>?', text)
    if pm:
        return _to_pascal_case(pm.group(1))

    if text.startswith('<<'):
        rest = text[2:].strip()
        if rest:
            return _to_pascal_case(rest)

    words = re.split(r'\s+', text)
    words = [w for w in words if w]
    words = words[:3]
    name = ' '.join(words)
    name = re.sub(r'[^a-zA-Z0-9_ ]', '', name)
    return _to_pascal_case(name)


def build_container_names(html):
    mapping = {}
    seen = {}
    state = [0]

    for m in re.finditer(r'<div\s+id="(_idContainer\d{3})"[^>]*>', html):
        cid = m.group(1)
        tag_end = m.end()
        depth = 1
        pos = tag_end
        content = ''
        while depth > 0:
            next_open = html.find('<div', pos)
            next_close = html.find('</div>', pos)
            if next_close == -1:
                content = html[tag_end:]
                break
            if next_open != -1 and next_open < next_close:
                depth += 1
                pos = next_open + 4
            else:
                depth -= 1
                if depth == 0:
                    content = html[tag_end:next_close]
                pos = next_close + 6

        name = _content_to_name(content, state)
        if name is None:
            state[0] += 1
            name = f'Container{state[0]}'

        if name in seen:
            seen[name] += 1
            name = f'{name}{seen[name]}'
        else:
            seen[name] = 1

        mapping[cid] = f'_idContainer{name}'

    return mapping


def rename_ids(text, mapping):
    for old, new in mapping.items():
        text = text.replace(old, new)
    return text


def main(html_src, css_src, out_dir):
    raw_html = html_src.read_text(encoding='utf-8')
    mapping = build_container_names(raw_html)

    html = clean_html(raw_html)
    css = clean_css(css_src.read_text(encoding='utf-8'))

    html = rename_ids(html, mapping)
    css = rename_ids(css, mapping)

    html_out = out_dir / 'html' / 'publication.html'
    css_out = out_dir / 'css' / 'idGeneratedStyles.css'
    html_out.parent.mkdir(parents=True, exist_ok=True)
    css_out.parent.mkdir(parents=True, exist_ok=True)

    html_out.write_text(html, encoding='utf-8')
    css_out.write_text(css, encoding='utf-8')

    print(f'Written: {html_out}')
    print(f'Written: {css_out}')


def clean_html(text):
    text = re.sub(r' class="Marco-de-texto-b-sico"', '', text)
    text = re.sub(
        r' class="Marco-gr-fico-b-sico _idGenObjectStyle-Disabled"', '', text
    )

    text = re.sub(r'P-rrafo-b-sico ', '', text)

    text = re.sub(
        r'\n\t\t\t<div style="[^"]*">\n\t\t\t\t<p',
        '\n\t\t\t<p', text,
    )
    text = re.sub(r'\n\t\t\t</div>', '', text)

    text = re.sub(
        r'(<p[^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + merge_spans(m.group(2)) + m.group(3),
        text, flags=re.DOTALL,
    )

    text = re.sub(r' style="position:absolute;[^"]*"', '', text)

    text = re.sub(
        r'<a target="_blank" href="http://DBF_[^"]*">(.*?)</a>',
        lambda m: '<a>' + transform_dbf(m.group(1)) + '</a>',
        text, flags=re.DOTALL,
    )

    text = re.sub(r'\n{4,}', '\n\n\n', text)
    return text


def merge_spans(content):
    span_re = re.compile(r'<span\s+([^>]*)>([^<]*)</span>')

    segments = []
    pos = 0
    while pos < len(content):
        m = span_re.search(content, pos)
        if not m:
            segments.append(('raw', content[pos:]))
            break
        if m.start() > pos:
            segments.append(('raw', content[pos:m.start()]))
        segments.append(('span', m.group(1), m.group(2)))
        pos = m.end()

    if not any(s[0] == 'span' for s in segments):
        return content

    def get(attrs, name):
        ma = re.search(rf'{name}="([^"]*)"', attrs)
        return ma.group(1) if ma else ''

    def get_style(attrs, name):
        ma = re.search(rf'{name}:([^;]+)', attrs)
        return ma.group(1) if ma else ''

    result = []
    i = 0
    while i < len(segments):
        if segments[i][0] != 'span':
            result.append(segments[i][1])
            i += 1
            continue

        cur_attrs, cur_text = segments[i][1], segments[i][2]
        cls = get(cur_attrs, 'class')
        top = get_style(cur_attrs, 'top')

        text = cur_text
        j = i + 1
        while j < len(segments):
            if segments[j][0] != 'span':
                break
            nxt_attrs = segments[j][1]
            if (get(nxt_attrs, 'class') != cls
                    or get_style(nxt_attrs, 'top') != top):
                break
            text += segments[j][2]
            j += 1

        sid = get(cur_attrs, 'id')
        attr_parts = []
        if sid:
            attr_parts.append(f'id="{sid}"')
        if cls:
            attr_parts.append(f'class="{cls}"')
        result.append(f'<span {" ".join(attr_parts)}>{text}</span>')
        i = j

    return ''.join(result)


def transform_dbf(content):
    content = re.sub(
        r'&lt;&lt;([^&<]+?)&gt;&gt;',
        r'{{ template.\1 }}', content,
    )
    content = re.sub(
        r'&lt;&lt;([^&<]+?)(?=<)',
        r'{{ template.\1 }}', content,
    )
    return content


def clean_css(text):
    lines = []

    text = re.sub(
        r'^@import[^;]+;\n*',
        lambda m: lines.append(m.group()) or '',
        text, flags=re.MULTILINE,
    )

    rule_re = re.compile(r'([^{]+?)\s*\{([^}]*)\}', re.DOTALL)

    for m in rule_re.finditer(text):
        sel = m.group(1).strip()
        body = m.group(2).strip()

        if sel in (
            'div.Marco-de-texto-b-sico',
            'div.Marco-gr-fico-b-sico',
            'div._idGenObjectStyle-Disabled',
        ):
            continue

        if re.match(r'^#_idContainer\d{3},\s*#_idContainer\d{3}$', sel):
            s = simplify_container(sel, body)
            if s:
                lines.append(s)
            continue

        if re.match(r'^span\.CharOverride-\d+$', sel):
            lines.append(simplify_override(sel, body))
            continue

        if sel == 'p.ParaOverride-1':
            lines.append(
                'p.ParaOverride-1 {\n'
                '\tline-height:1;\n'
                '\twhite-space:nowrap;\n'
                '\ttext-align:center;\n'
                '}'
            )
            continue

        lines.append(f'{sel} {{\n\t{body}\n}}')

    return '\n\n'.join(lines) + '\n'


def simplify_container(sel, body):
    first = re.match(r'^(#_idContainer\d{3})', sel).group(1)

    props = {}
    for part in body.split(';'):
        part = part.strip()
        if ':' in part:
            k, v = part.split(':', 1)
            props[k.strip()] = v.strip()

    trans = props.get('transform', '')
    if not trans:
        return None

    t = re.search(r'translate\(([^,]+),([^)]+)\)', trans)
    r = re.search(r'rotate\(([^)]+)\)', trans)
    if not t:
        return None

    tx, ty = t.group(1), t.group(2)
    rot = r.group(1) if r else '0deg'
    width = props.get('width', '')
    height = props.get('height', '')

    new = ['\tposition:absolute;']
    if width:
        new.append(f'\twidth:{width};')
    if height:
        new.append(f'\theight:{height};')
    new.append(f'\tleft:{tx};')
    new.append(f'\ttop:{ty};')

    deg = float(rot.replace('deg', ''))
    if abs(deg) > 0.001:
        new.append(f'\ttransform:rotate({rot});')

    return f'{first} {{\n' + '\n'.join(new) + '\n}'


def simplify_override(sel, body):
    out = []
    for part in body.split(';'):
        part = part.strip()
        if not part:
            continue
        if part in ('font-style:normal', 'font-weight:normal'):
            continue
        out.append(f'\t{part};')
    if out:
        return f'{sel} {{\n' + '\n'.join(out) + '\n}'
    return ''


if __name__ == '__main__':

    if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'):
        print(__doc__)
        sys.exit(0)

    base_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(base_dir, 'output')
    html_src = Path(base_dir) / 'html' / 'publication.html'
    css_src = Path(base_dir) / 'css' / 'idGeneratedStyles.css'

    main(html_src, css_src, Path(out_dir))
