export function set_document_hash(hash) {
	document.location.hash = hash;
}

export function document_hash() {
	return document.location.hash || "";
}
