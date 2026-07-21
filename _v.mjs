import {parse} from '@babel/parser'; import fs from 'fs'; import path from 'path'; import {execSync} from 'child_process'
const files=execSync('find src -name "*.jsx" -o -name "*.js"').toString().trim().split('\n')
let bad=0,prob=0
const readSafe=p=>{for(const c of [p,p+'.js',p+'.jsx']){if(fs.existsSync(c)&&fs.statSync(c).isFile())return fs.readFileSync(c,'utf8')}return null}
for(const f of files){
  let src; try{src=fs.readFileSync(f,'utf8'); parse(src,{sourceType:'module',plugins:['jsx']})}catch(e){bad++;console.log('PARSE '+f+' :: '+e.message.split('\n')[0]);continue}
  let m; const re=/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g
  while((m=re.exec(src))){
    const names=m[1].split(',').map(s=>s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    const t=readSafe(path.resolve(path.dirname(f),m[2]))
    if(t==null){console.log('MISSING MODULE: '+f+' -> '+m[2]);prob++;continue}
    for(const n of names){ if(!(new RegExp('export\\s+(async\\s+)?(const|function|class|let|var)\\s+'+n+'\\b').test(t)||new RegExp('export\\s*\\{[^}]*\\b'+n+'\\b').test(t))){console.log('MISSING EXPORT: '+n+' ('+f+' -> '+m[2]+')');prob++} }
  }
}
console.log((bad?bad+' parse fails':'all parse')+' / '+(prob?prob+' import problems':'all imports ok'))
