"""Author-only course validation. Uses installed g++; installs nothing."""
from pathlib import Path
import subprocess
import struct
import json
import hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
results = []

def build(source, folder, harness=False):
    folder.mkdir(exist_ok=True, parents=True)
    if harness:
        (folder/'candidate.inc').write_text('#include "'+source.as_posix()+'"\n', encoding='utf-8')
        source = ROOT/'checks/line_check.cpp'
    exe = folder/'run.exe'
    command = ['g++','-std=c++17','-O2','-Wall','-Wextra','-I'+str(ROOT/'upstream'),
               '-I'+str(ROOT/'support'),'-I'+str(folder),str(source),
               str(ROOT/'upstream/tgaimage.cpp'),'-o',str(exe)]
    p = subprocess.run(command, capture_output=True, text=True, timeout=60)
    if p.returncode: raise RuntimeError(p.stderr)
    p = subprocess.run([str(exe)], cwd=folder, capture_output=True, text=True, timeout=30)
    return p

def pixels(folder):
    b=(folder/'preview.bmp').read_bytes()
    assert b[:2]==b'BM' and struct.unpack_from('<ii',b,18)==(16,16)
    assert struct.unpack_from('<H',b,28)[0]==24
    offset=struct.unpack_from('<I',b,10)[0]
    rgb={}
    for y in range(16):
        for x in range(16):
            pos=offset+(15-y)*48+x*3
            rgb[x,y]=tuple(reversed(b[pos:pos+3]))
    t=(folder/'framebuffer.tga').read_bytes()
    assert t[2]==2 and t[16]==24 and t[17]==32
    assert struct.unpack_from('<HH',t,12)==(16,16)
    for y in range(16):
        for x in range(16):
            pos=18+(y*16+x)*3
            assert tuple(reversed(t[pos:pos+3]))==rgb[x,y]
    return {p:c for p,c in rgb.items() if c!=(0,0,0)}

# Teaching headings: the app parser refuses the whole lesson if a level has anything
# other than these exact 8 second-level headings in this exact order. The first 7 are
# shared by every level; heading 8 names that level's own transfer exercise.
COMMON = ['目标','只学本题需要的 C++','任务与可修改范围','公开样例和完成条件',
          '典型错误','逐级提示','答案解析']
for level,transfer in [('level-01','迁移练习：镜子另一侧的青点'),
                       ('level-02','迁移练习：倒着画一条陡线')]:
    want = COMMON + [transfer]
    lesson = (ROOT/level/'lesson.md').read_text(encoding='utf-8').replace('\r\n','\n')
    got = [line[3:].strip() for line in lesson.split('\n') if line.startswith('## ')]
    assert got == want, (level, got)
    results.append(level+' lesson.md: exactly 8 second-level headings, exact text and order PASS')

for level,variant,want in [
    ('level-01','starter',{(4,6):(255,255,255)}),
    ('level-01','reference',{(4,6):(255,0,0)}),
    ('level-01','transfer',{(11,6):(0,255,255)}),
    ('level-02','starter',{(2,3):(0,255,0),(10,7):(0,255,0)}),
    ('level-02','reference',{p:(0,255,0) for p in [(2,3),(3,4),(4,4),(5,5),(6,5),(7,6),(8,6),(9,7),(10,7)]}),
    ('level-02','transfer',{p:(255,255,0) for p in [(5,12),(5,11),(4,10),(4,9),(4,8),(3,7),(3,6),(3,5),(2,4),(2,3)]})]:
    folder=OUT/(level+'-'+variant)
    p=build(ROOT/level/(variant+'.cpp'),folder)
    assert p.returncode==0, p.stderr
    assert pixels(folder)==want, (level,variant)
    results.append(level+'/'+variant+': compile/run and BMP/TGA exact pixels PASS')
assert pixels(OUT/'level-01-starter') != pixels(OUT/'level-01-reference')
results.append('level-01 initial image rejected by task target: PASS')

reference=(ROOT/'level-02/reference.cpp').read_text(encoding='utf-8')
variants={
    'reference':reference,
    'starter':(ROOT/'level-02/starter.cpp').read_text(encoding='utf-8'),
    'missing-end':reference.replace('i <= steps','i < steps'),
    'integer-division':reference.replace('double(i) / steps','i / steps'),
    'x-only-steps':reference.replace('std::max(std::abs(dx), std::abs(dy))','std::abs(dx)'),
    'wrong-color':reference.replace('image.set(x, y, color);','image.set(x, y, {0,255,0,255});'),
    'missing-single-point':reference.replace('image.set(ax, ay, color);','/* omitted */'),
    'erase-background':reference.replace('const int dx = bx - ax;', 'image = TGAImage(16,16,TGAImage::RGB);\n    const int dx = bx - ax;'),
}
for name,source in variants.items():
    folder=OUT/('check-'+name)
    folder.mkdir(exist_ok=True)
    candidate=folder/'candidate.cpp'
    candidate.write_text(source,encoding='utf-8')
    p=build(candidate,folder,True)
    if name=='reference': assert p.returncode==0,p.stderr
    else: assert p.returncode==1,(name,p.stdout,p.stderr)
    results.append('line '+name+': '+('PASS' if name=='reference' else 'correctly rejected')+' '+(p.stdout+p.stderr).strip())

for name,old,new in [('blue','{0, 0, 255, 255}','{255, 0, 0, 255}'),
                     ('swapped','set(4, 6','set(6, 4'),('out-of-range','set(4, 6','set(16, 6')]:
    folder=OUT/('pixel-error-'+name)
    folder.mkdir(exist_ok=True)
    source=folder/'candidate.cpp'
    source.write_text((ROOT/'level-01/reference.cpp').read_text().replace(old,new))
    p=build(source,folder)
    assert p.returncode==0 and pixels(folder)!={(4,6):(255,0,0)}
    results.append('pixel '+name+': correctly rejected')

version=subprocess.run(['g++','--version'],capture_output=True,text=True).stdout.splitlines()[0]
(OUT/'verification.txt').write_text(version+'\n'+'\n'.join(results)+'\n',encoding='utf-8')
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'upstream').glob('*') if p.is_file()}
(ROOT/'upstream-sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
print('\n'.join(results))
