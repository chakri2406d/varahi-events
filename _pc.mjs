import {parse} from '@babel/parser'; import fs from 'fs'; import {execSync} from 'child_process'
const files=execSync('find src -name "*.jsx" -o -name "*.js"').toString().trim().split('\n')
let bad=0
for(const f of files){ try{ parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}) }
 catch(e){ bad++; console.log('FAIL '+f+' :: '+e.message.split('\n')[0]) } }
console.log(bad?`\n${bad} FAILED`:`All ${files.length} files parsed OK`)
