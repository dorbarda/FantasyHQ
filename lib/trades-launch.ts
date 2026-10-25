/**
 * Trade suggestions are hidden until Dor publishes them (decided 2026-10-25:
 * "publish for all on week 3"). While false: no menu links, /trades is a 404,
 * and only the commissioner (ADMIN_KEY) can open a team page. Owner codes are
 * refused. Flip to true to launch. No I/O, so the client menu can import it.
 */
export const TRADES_PUBLIC = false;

/** Shown to an owner who tries their code before launch. */
export const TRADES_NOT_OPEN = 'Not open yet — trade advice opens in week 3.';
