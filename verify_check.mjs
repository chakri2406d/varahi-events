import {parse} from '@babel/parser';
import fs from 'fs';
const files = [
 'src/utils/constants.js','src/utils/invoiceGenerator.js',
 'src/components/booking/PaymentSection.jsx','src/pages/Contact.jsx',
 'src/components/home/CallToAction.jsx','src/components/home/Hero.jsx',
 'src/components/home/Works.jsx','src/components/home/FutureEvents.jsx',
 'src/pages/Events.jsx','src/components/layout/Footer.jsx',
 'src/components/admin/ExpenseManagement.jsx','src/components/booking/BookingFlow.jsx'
];
let bad=0;
for(const f of files){ try{ parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}); console.log('OK   '+f);}catch(e){bad++;console.log('FAIL '+f+' :: '+e.message.split('\n')[0]);} }
console.log(bad?`\n${bad} FAILED`:'\nAll parsed OK');
