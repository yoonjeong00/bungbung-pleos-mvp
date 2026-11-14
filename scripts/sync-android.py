from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
dst=root/'android/app/src/main/assets'
dst.mkdir(parents=True,exist_ok=True)
for name in ['index.html','style.css','nerget-theme.css','room-theme.css','layout-editor.css','hmi.css']:
 if not (root/'dist'/name).exists(): continue
 text=(root/'dist'/name).read_text(encoding='utf-8')
 if name=='style.css': text='\n'.join(x for x in text.splitlines() if not x.startswith('@import'))
 (dst/name).write_text(text,encoding='utf-8')
shutil.copytree(root/'dist/js',dst/'js',dirs_exist_ok=True)

if (root/'dist/bungbung-assets').exists(): shutil.copytree(root/'dist/bungbung-assets',dst/'bungbung-assets',dirs_exist_ok=True)

shutil.copytree(root/'dist/hmi-assets',dst/'hmi-assets',dirs_exist_ok=True)