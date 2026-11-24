from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
dst=root/'android/app/src/main/assets'
# 복사 전에 화면 복사 폴더(android/app/src/main/assets)만 비운다. 지운 dist 파일이 앱에 남지 않게 하기 위함.
# 안전장치: 경로가 정확히 이 폴더이고 바로가기(링크)가 아닐 때만 비운다. 그 밖의 파일은 건드리지 않는다.
expected=root/'android'/'app'/'src'/'main'/'assets'
if dst!=expected or dst.is_symlink() or dst.resolve()!=expected or root not in dst.resolve().parents:
 raise SystemExit(f'비울 폴더 경로가 예상과 달라 멈춤: {dst}')
if dst.exists(): shutil.rmtree(dst)
dst.mkdir(parents=True,exist_ok=True)
for name in ['index.html','hmi.css']:
 text=(root/'dist'/name).read_text(encoding='utf-8')
 (dst/name).write_text(text,encoding='utf-8')
shutil.copytree(root/'dist/js',dst/'js',dirs_exist_ok=True)

shutil.copytree(root/'dist/hmi-assets',dst/'hmi-assets',dirs_exist_ok=True)