import fs from 'fs'; import path from 'path'; import {execSync} from 'child_process'
const files=execSync('find src -name "*.jsx" -o -name "*.js"').toString().trim().split('\n')
const readSafe=p=>{for(const c of [p,p+'.js',p+'.jsx',p+'/index.js',p+'/index.jsx']){if(fs.existsSync(c)&&fs.statSync(c).isFile())return {src:fs.readFileSync(c,'utf8'),file:c}}return null}
let problems=0
for(const f of files){
  const src=fs.readFileSync(f,'utf8')
  const re=/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g
  let m
  while((m=re.exec(src))){
    const names=m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    const target=readSafe(path.resolve(path.dirname(f),m[2]))
    if(!target){ console.log(`MISSING MODULE: ${f} -> ${m[2]}`); problems++; continue }
    for(const n of names){
      const ok=new RegExp(`export\\s+(const|function|class|let|var)\\s+${n}\\b`).test(target.src)
        || new RegExp(`export\\s*\\{[^}]*\\b${n}\\b`).test(target.src)
      if(!ok){ console.log(`MISSING EXPORT: ${n}  (${f} -> ${m[2]})`); problems++ }
    }
  }
  // default imports
  const dre=/import\s+([A-Za-z0-9_$]+)\s*(?:,\s*\{[^}]*\})?\s*from\s*['"](\.[^'"]+)['"]/g
  while((m=dre.exec(src))){
    const target=readSafe(path.resolve(path.dirname(f),m[2]))
    if(!target){ console.log(`MISSING MODULE(default): ${f} -> ${m[2]}`); problems++; continue }
    if(!/export\s+default/.test(target.src)){ console.log(`NO DEFAULT EXPORT: ${m[2]} (imported by ${f})`); problems++ }
  }
}
console.log(problems?`\n${problems} problem(s)`:'\nAll local imports resolve correctly')
