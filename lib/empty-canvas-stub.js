// Empty stub used by next.config.ts to alias the Node-only `canvas`
// package out of client bundles. @react-pdf/renderer references `canvas`
// as an optional fallback even though the browser provides
// HTMLCanvasElement natively; pulling it into the bundle breaks
// pdf().toBlob() in production. See next.config.ts for context.
module.exports = {};
