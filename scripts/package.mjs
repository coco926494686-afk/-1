import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});
await mkdir('artifacts',{recursive:true});
// Python's standard ZIP writer needs no extra package and follows only the explicit paths below.
execFileSync('python3',['-c',`
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
files=['manifest.json','package.json','package-lock.json','tsconfig.json','.gitignore','README.md','LICENSE']
folders=['dist','src','scripts','tests','examples']
files += [str(p) for folder in folders for p in Path(folder).rglob('*') if p.is_file()]
files += [str(p) for p in Path('artifacts').glob('*') if p.suffix in ['.png','.md']]
with ZipFile('artifacts/frame-skin-free.zip','w',ZIP_DEFLATED) as z:
 for f in files: z.write(f,'frame-skin-free/'+f)
print('Packaged artifacts/frame-skin-free.zip')
`],{stdio:'inherit'});
