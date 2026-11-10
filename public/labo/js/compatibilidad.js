export const compatibleModelHash=(hash,model)=>typeof hash==='string'&&(hash===model.contentHash||(Array.isArray(model.compatiblePreviousHashes)&&model.compatiblePreviousHashes.includes(hash)));
