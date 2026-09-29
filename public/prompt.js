// Shared by the browser and the server: upgrades older saved standards and assembles the branding block.

export const DEFAULT_FORMATS = [
 {id:'Word (.docx)',name:'Word (.docx)',rules:'Apply actual Word paragraph and table styles. Embed logo image bytes, use real header/footer sections and page-number fields, and keep the document editable. Avoid layout built from spaces or manual line breaks.'},
 {id:'HTML',name:'HTML',rules:'Use semantic headings and consistent CSS. Embed the logo as a data URI or package a local asset for a downloadable HTML document; do not rely on a link requiring a login. Include print styles and use supported paged-media behaviour for printed footers. Do not claim reliable page counts in ordinary browser HTML.'},
 {id:'PDF',name:'PDF',rules:'Apply the same brand styles in the requested output. Embed assets and fonts only where available and permitted; inspect the rendered result.'},
 {id:'PowerPoint (.pptx)',name:'PowerPoint (.pptx)',rules:'Use slide masters/layouts where supported. Embed the logo, maintain slide numbering and consistent title, body and chart styles. Keep content readable and editable. Do not force document page dimensions onto slides.'}
];
export const DEFAULT_GUIDE = {
 howTo:'Apply these institutional design instructions to the document requested in my main prompt. They govern presentation and branding. Preserve my substantive task, analysis, facts, length and requested tone. Do not invent a new outline, impose a length, rewrite approved terms or add promotional text merely to apply the brand. If my formatting instructions conflict with this block, flag the conflict before finalising.',
 fileRules:'I have attached the files listed above to this message. Use the attached copies directly. If any of them is missing, ask me to attach it before producing the file. Never recreate, redraw, recolour or substitute the logo. The backup links may be used only if your tools can download them; confirm the download succeeded and never pretend to have opened a file you could not access. Reference documents guide presentation only; their text, data and examples must not become content for an unrelated task. If this block conflicts with a reference document, this block takes precedence.',
 templateRules:'Build the output from the attached template. Keep its page setup, styles, colours, header/footer and logo placement. Replace its sample content with my content, remove unused sample material, and do not restyle the template. The written rules in this block fill any gaps the template does not cover.',
 finalCheck:'Check logo integrity; headings and fonts; footer and numbering; consistent tables and chart colours; source labels; readable contrast; whitespace; and page/slide overflow. Check short and long sections without forcing a fixed document length. Report missing fonts, assets or unsupported output features. If you cannot create the requested file type, say so rather than claiming a file exists.',
 staffSteps:'Write your own task prompt in ChatGPT, Claude or Gemini.\nPaste the branding instructions after it.\nAttach the logo and any template listed on this page to the same message, then send.',
 helpNote:'Questions about the NCGCL standard? Contact the communications editor.'
};
export const DEFAULT_LABELS = ['Public','Internal','Confidential'];
export const ASSET_KINDS = ['Logo','Template','Brand guide','Benchmark','Font','Reference'];

// Older saved assets used a single "scope"; newer ones list document types and formats. Empty lists mean "all".
export function assetTargets(a){const scopes=Array.isArray(a.scopes)?a.scopes:(a.scope&&a.scope!=='all'?[a.scope]:[]);const formats=Array.isArray(a.formats)?a.formats:[];const attach=typeof a.attach==='boolean'?a.attach:['Logo','Template'].includes(a.kind);return {scopes,formats,attach};}

// Combine entries that point to the same file (e.g. one benchmark listed separately for three document types).
export function mergeAssets(c){const out=[];let changed=false;for(const a of c.assets){const t=assetTargets(a);const same=out.find(b=>b.url===a.url&&b.kind===a.kind);if(!same){const copy={...a,scopes:[...t.scopes],formats:[...t.formats],attach:t.attach};delete copy.scope;out.push(copy);continue;}changed=true;same.scopes=same.scopes.length&&t.scopes.length?[...new Set([...same.scopes,...t.scopes])]:[];same.formats=same.formats.length&&t.formats.length?[...new Set([...same.formats,...t.formats])]:[];same.attach=same.attach||t.attach;}c.assets=out;return changed;}

// Brings standards saved by earlier versions of the studio into the current shape. Safe to run repeatedly.
export function upgradeConfig(input){
 const c=structuredClone(input);
 if(!Array.isArray(c.palette)){c.palette=[['Primary blue',c.blue||'#035076','Main brand colour: headings, primary data series and key accents.'],['Accent green',c.green||'#39A949','Selective emphasis only.'],['Secondary blue',c.secondary||'#11688A','Supporting colour for secondary series and fills.'],['Neutral grey',c.grey||'#BABABA','Rules, gridlines and neutral comparisons.'],['White','#FFFFFF','Page background and text on dark fills.']].map(([name,hex,use],i)=>({id:'colour-'+(i+1),name,hex,use}));}
 for(const k of ['blue','green','secondary','grey'])delete c[k];
 if(!Array.isArray(c.formats))c.formats=structuredClone(DEFAULT_FORMATS);
 if(!Array.isArray(c.labels))c.labels=[...DEFAULT_LABELS];
 c.guide={...DEFAULT_GUIDE,...(c.guide&&typeof c.guide==='object'?c.guide:{})};
 c.types=(c.types||[]).map(t=>{const u={...t};if(typeof u.extra==='string'&&u.extra.trim())u.rules=`${u.rules||''}\n\n${u.extra.trim()}`.trim();delete u.extra;return u;});
 // Older files had no attach setting: attach templates and the first logo only (e.g. not the white variant).
 let firstLogo=true;c.assets=(c.assets||[]).map(a=>{if(typeof a.attach==='boolean')return a;const attach=a.kind==='Template'||(a.kind==='Logo'&&firstLogo);if(a.kind==='Logo')firstLogo=false;return {...a,attach};});mergeAssets(c);
 return c;
}

export function assetsFor(config,typeId,format){return config.assets.filter(a=>{const t=assetTargets(a);return (!t.scopes.length||t.scopes.includes(typeId))&&(!format||!t.formats.length||t.formats.includes(format));});}

export function makeBlock(input, typeId, details = {}, version = 'draft', origin = '') {
 const config=upgradeConfig(input);const g=config.guide;
 const type=config.types.find(t=>t.id===typeId);if(!type)throw Error('Choose a document type.');
 const formatId=details.format&&type.formats.includes(details.format)?details.format:type.formats[0];
 const format=config.formats.find(f=>f.id===formatId)||{id:formatId,name:formatId,rules:''};
 const assets=assetsFor(config,type.id,format.id);const attached=assets.filter(a=>assetTargets(a).attach);const template=attached.find(a=>a.kind==='Template');
 const absolute=url=>new URL(url,origin||'https://your-studio.example').href;
 const metadata=[['Document title',details.title],['Author / team',details.author],['Date',details.date],['Confidentiality label',details.classification]].filter(([,v])=>v?.trim()).map(([k,v])=>`${k}: ${v.trim()}`).join('\n');
 const section=(title,body)=>body&&String(body).trim()?`\n\n${title}\n${String(body).trim()}`:'';
 return `BEGIN NCGCL BRAND & FORMATTING INSTRUCTIONS
Published standards: ${version}
Document type: ${type.name}
Output format: ${format.name}`
 +section('HOW TO USE THIS BLOCK',g.howTo)
 +section('INSTITUTIONAL IDENTITY',`Organisation: ${config.organisation}\nColours:\n${config.palette.map(p=>`- ${p.name} ${p.hex}${p.use?.trim()?`: ${p.use.trim()}`:''}`).join('\n')}\nHeadings: ${config.headingFont}. Body: ${config.bodyFont}.\n${config.fontRules}`)
 +section('LOGO',config.logoRules)
 +section('PAGE DESIGN',config.pageRules)
 +section('HEADINGS, SPACING & LISTS',config.textRules)
 +section('TABLES, CHARTS & SOURCES',config.exhibitRules)
 +section('HEADER & FOOTER',`Header content: ${config.headerText||'No fixed header text; follow the layout rules.'}\nFooter content: ${config.footerText}\n${config.footerRules}\nSubstitute supplied metadata in {{title}}, {{author}}, {{date}} and {{classification}}. Use a real page-number field for {{page}} in Word or presentation slide numbers where applicable. Omit an empty metadata slot and its separator. Never print unfilled placeholders.`)
 +section(`${format.name.toUpperCase()} HANDLING`,format.rules)
 +section('DOCUMENT-SPECIFIC DESIGN',type.rules)
 +section('ADDITIONAL INSTITUTIONAL INSTRUCTIONS',config.extra)
 +section('DOCUMENT DETAILS',metadata)
 +section('FILES ATTACHED TO THIS MESSAGE',attached.length?attached.map((a,i)=>`${i+1}. ${a.name} [${a.kind}]\n   Use: ${a.usage}`).join('\n'):'No attachments are required for this document type and format.')
 +(template?section('TEMPLATE',`Template to use: "${template.name}".\n${g.templateRules}`):'')
 +section('BACKUP LINKS',assets.length?assets.map((a,i)=>`${i+1}. ${a.name} [${a.kind}]: ${absolute(a.url)}${assetTargets(a).attach?'':`\n   Use: ${a.usage}`}`).join('\n'):'No files are assigned.')
 +(attached.length||assets.length?section('USING THE FILES',g.fileRules):'')
 +section('FINAL PRESENTATION CHECK',g.finalCheck)
 +'\nEND NCGCL BRAND & FORMATTING INSTRUCTIONS';
}
