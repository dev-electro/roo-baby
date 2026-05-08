/**
 * Analysis history — persisted in localStorage.
 * Each entry stores result + metadata for the session.
 */

const HISTORY_KEY = 'roo_history';
const MAX_ENTRIES = 50;

/** @returns {Array} */
export function getHistory() {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** @param {Object} result - API result object */
export function saveToHistory(result) {
	if (typeof window === 'undefined') return;
	try {
		const history = getHistory();
		const entry = {
			id: crypto.randomUUID?.() || Date.now().toString(),
			category: result.category,
			confidence: result.confidence,
			severity: result.severity,
			reasoning: result.reasoning,
			parent_action: result.parent_action,
			response_sound: result.response_sound,
			timestamp: result._meta?.timestamp || new Date().toISOString(),
			mode: result._meta?.mode || 'audio',
			model: result._meta?.model || 'unknown',
			pre_cry: result.pre_cry || false
		};
		history.unshift(entry);
		if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
		localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
	} catch {}
}

export function clearHistory() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(HISTORY_KEY);
}

/**
 * Group history entries by date for display
 */
export function getGroupedHistory() {
	const entries = getHistory();
	const groups = {};
	for (const entry of entries) {
		const date = new Date(entry.timestamp).toLocaleDateString();
		if (!groups[date]) groups[date] = [];
		groups[date].push(entry);
	}
	return groups;
}
