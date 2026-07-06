import { parse } from '@babel/parser'
import fs from 'fs'
const files = [
  'src/firebase/firestore.js',
  'src/pages/Dashboard.jsx',
  'src/pages/Calendar.jsx',
  'src/pages/Login.jsx',
  'src/components/admin/BookingManagement.jsx',
]
let bad = 0
for (const f of files) {
  try {
    parse(fs.readFileSync(f,'utf8'), { sourceType:'module', plugins:['jsx'] })
    console.log('OK   ', f)
  } catch (e) { bad++; console.log('FAIL ', f, '->', e.message) }
}
process.exit(bad ? 1 : 0)
