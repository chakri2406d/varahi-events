import fs from 'fs'; import path from 'path'; import {execSync} from 'child_process'
const files=execSync('find src -name "*.jsx" -o -name "*.js"').toString().trim().split('\n')
const readSafe=p=>{for(const c of [p,p+'.js',p+'.jsx']){if(fs.existsSync(c)&&fs.statSync(c).isFile())return fs.readFileSync(c,'utf8')}return null}
let problems=0
for(const f of files){
  const src=fs.readFileSync(f,'utf8')
  const re=/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g
  let m
  while((m=re.exec(src))){
    const names=m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    const t=readSafe(path.resolve(path.dirname(f),m[2]))
    if(t==null){ console.log(`MISSING MODULE: ${f} -> ${m[2]}`); problems++; continue }
    for(const n of names){
      const ok=new RegExp(`export\\s+(async\\s+)?(const|function|class|let|var)\\s+${n}\\b`).test(t)
        || new RegExp(`export\\s*\\{[^}]*\\b${n}\\b`).test(t)
      if(!ok){ console.log(`MISSING EXPORT: ${n}  (${f} -> ${m[2]})`); problems++ }
    }
  }
}
console.log(problems?`\n${problems} REAL problem(s)`:'\nAll named imports resolve correctly')
