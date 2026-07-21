import {parse} from '@babel/parser'; import fs from 'fs'; import path from 'path'; import {execSync} from 'child_process'
const files=execSync('find src -name "*.jsx" -o -name "*.js"').toString().trim().split('\n')
let bad=0
for(const f of files){ try{ parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}) }
 catch(e){ bad++; console.log('PARSE FAIL '+f+' :: '+e.message.split('\n')[0]) } }
console.log(bad?`${bad} PARSE FAILURES`:`All ${files.length} files parsed OK`)
const readSafe=p=>{for(const c of [p,p+'.js',p+'.jsx']){if(fs.existsSync(c)&&fs.statSync(c).isFile())return fs.readFileSync(c,'utf8')}return null}
let prob=0
for(const f of files){
  const src=fs.readFileSync(f,'utf8'); let m
  const re=/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g
  while((m=re.exec(src))){
    const names=m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    const t=readSafe(path.resolve(path.dirname(f),m[2]))
    if(t==null){console.log(`MISSING MODULE: ${f} -> ${m[2]}`);prob++;continue}
    for(const n of names){
      const ok=new RegExp(`export\\s+(async\\s+)?(const|function|class|let|var)\\s+${n}\\b`).test(t)||new RegExp(`export\\s*\\{[^}]*\\b${n}\\b`).test(t)
      if(!ok){console.log(`MISSING EXPORT: ${n} (${f} -> ${m[2]})`);prob++}
    }
  }
  const lz=/lazy\(\(\)\s*=>\s*import\(['"](\.[^'"]+)['"]\)\)/g
  while((m=lz.exec(src))){
    const t=readSafe(path.resolve(path.dirname(f),m[1]))
    if(t==null){console.log(`LAZY MISSING: ${f} -> ${m[1]}`);prob++}
    else if(!/export\s+default/.test(t)){console.log(`LAZY NO DEFAULT: ${m[1]}`);prob++}
  }
}
console.log(prob?`${prob} IMPORT PROBLEM(S)`:'All imports resolve')
