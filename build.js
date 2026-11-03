const fs=require('fs');
const esb=require('esbuild');
let h=fs.readFileSync(process.argv[2]||'index.source.html','utf8');
const before=h.length;
let nJs=0,nCss=0;
// 1) scripts
h=h.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g,(m,attrs,body)=>{
  if(/\bsrc=/.test(attrs)) return m;
  if(/application\/ld\+json/.test(attrs)){ try{return `<script${attrs}>${JSON.stringify(JSON.parse(body))}</script>`}catch(e){return m} }
  if(!body.trim()) return m;
  const r=esb.transformSync(body,{minify:true,legalComments:'none',charset:'utf8',target:'es2019'});
  nJs++; return `<script${attrs}>${r.code.trim()}</script>`;
});
// 2) styles
h=h.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(m,attrs,body)=>{
  const r=esb.transformSync(body,{loader:'css',minify:true,legalComments:'none',charset:'utf8'});
  nCss++; return `<style${attrs}>${r.code.trim()}</style>`;
});
// 3) html comments outside script/style, and indentation
const parts=h.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<textarea[\s\S]*?<\/textarea>)/g);
h=parts.map((p,i)=> i%2? p : p.replace(/<!--(?!\[if)[\s\S]*?-->/g,'').replace(/^[ \t]+/gm,'').replace(/\n{2,}/g,'\n')).join('');
fs.writeFileSync(process.argv[3]||'../war-shop-site/index.html',h);
console.log({before,after:h.length,nJs,nCss});
