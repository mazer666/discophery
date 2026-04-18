import glob
import re

files = glob.glob('src/*.ts')

for file in files:
    if file.endswith('types.ts') or file.endswith('global.d.ts') or file.endswith('main.ts'):
        continue
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to append window.X = X at the end of the file for all functions, consts, lets that are not underscored
    # This exposes everything to the global scope since modules isolate them.
    
    # match top-level declarations
    declarations = re.findall(r'^(?:export\s+)?(?:async\s+)?(?:function|const|let)\s+([a-zA-Z_0-9]+)\b', content, re.MULTILINE)
    
    appends = []
    for decl in declarations:
        if decl not in ['Math', 'Date', 'Array', 'String', 'Object', 'document', 'window', 'console']:
            appends.append(f"(window as any).{decl} = {decl};")
            
    if appends:
        content += "\n// --- Auto-generated global exports for Vite migration ---\n"
        content += "\n".join(appends) + "\n"
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
    print(f"Processed {file}")
