const norm=v=>String(v||'').toLowerCase().replace(/[–—]/g,'-').replace(/\s/g,'');
export function exactReferences(index,query){
  const wanted=new Set((String(query).match(/\b\d{4}[ab]\s*\d{1,2}(?:\s*[-–—]\s*(?:\d{4})?[ab]?\d{1,2})?/gi)||[]).map(norm));
  return index.documents.filter(d=>d.kind==='subunidad'&&d.es&&d.gr&&wanted.has(norm(d.reference)));
}
// A whole paragraph that contains a subunit supplies its surrounding proposition.
export function containingParagraph(index,doc){
  return index.documents.find(p=>p.kind==='parrafo'&&p.es&&p.gr&&p.chapter===doc.chapter&&p.relatedSubunits?.some(id=>doc.relatedSubunits?.includes(id)));
}
