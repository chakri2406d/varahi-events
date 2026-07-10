import {parse} from '@babel/parser';
import fs from 'fs';
const base='/sessions/funny-keen-volta/mnt/varahi-events/';
const files=['src/utils/constants.js','src/utils/invoiceGenerator.js','src/components/booking/PaymentSection.jsx','src/pages/Contact.jsx','src/components/home/CallToAction.jsx'];
let bad=0;
for(const f of files){ try{ parse(fs.readFileSync(base+f,'utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK   '+f);}catch(e){bad++;console.log('FAIL '+f+' :: '+e.message.split('\n')[0]);
 const ln=parseInt(e.loc?.line); if(ln){const arr=fs.readFileSync(base+f,'utf8').split('\n'); for(let i=Math.max(0,ln-2);i<ln+1;i++)console.log('   '+(i+1)+': '+JSON.stringify(arr[i]));}} }
console.log(bad?`${bad} FAILED`:'All parsed OK');
