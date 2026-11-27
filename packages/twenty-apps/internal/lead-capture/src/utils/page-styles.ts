// Neutral styling: the page shows the customer's form, not the CRM's brand.
export const PAGE_STYLES = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#1f2328;background:#f6f7f9;line-height:1.5;-webkit-font-smoothing:antialiased}
body.embedded{background:transparent}
main{max-width:560px;margin:0 auto;padding:32px 16px}
body.embedded main{padding:8px 4px}
.card{background:#fff;border:1px solid #e3e6ea;border-radius:12px;padding:28px 24px}
body.embedded .card{border:0;padding:4px}
h1{font-size:1.5rem;line-height:1.3;margin:0 0 8px}
.intro{color:#57606a;margin:0 0 24px;white-space:pre-line}
.field{margin-bottom:18px}
label{display:block;font-weight:600;font-size:.95rem;margin-bottom:6px}
.required{color:#cf222e;margin-left:2px}
input,select,textarea{width:100%;font:inherit;color:inherit;background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:11px 12px;outline:none;transition:border-color .15s,box-shadow .15s}
textarea{min-height:110px;resize:vertical}
input:focus,select:focus,textarea:focus{border-color:#57606a;box-shadow:0 0 0 3px rgba(87,96,106,.15)}
.field.invalid input,.field.invalid select,.field.invalid textarea{border-color:#cf222e}
.error{color:#cf222e;font-size:.875rem;margin-top:6px;min-height:0}
.form-error{color:#cf222e;margin:0 0 16px}
button{width:100%;font:inherit;font-weight:600;color:#fff;background:#1f2328;border:0;border-radius:8px;padding:12px 16px;cursor:pointer;transition:opacity .15s}
button:hover{opacity:.9}
button:disabled{opacity:.6;cursor:wait}
.hp{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}
.done{text-align:center;padding:24px 8px}
.done h2{font-size:1.25rem;margin:0 0 8px}
.done p{color:#57606a;margin:0;white-space:pre-line}
.footer{text-align:center;color:#8c959f;font-size:.75rem;margin-top:16px}
`;
