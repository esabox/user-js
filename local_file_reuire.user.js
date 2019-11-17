// ==UserScript==
// @name         local_load@codepen
// @namespace    https://gist.github.com/esabox/
// @updateURL    https://codepen.io/esabox/pen/bzxpzo.js
// @homepageURL  https://codepen.io/esabox/pen/bzxpzo?editors=0012
// @version      2019.1106.111
// @author       nank
// @match        *://*/*
// @exclude      ^https://codepen.io/*
// @exclude      ^http://localhost*
// x@exclude    /^http://localhost.*/
// @grant	GM_registerMenuCommand
// @grant 	GM_getValue
// @grant 	GM_setValue
// @grant 	GM_deleteValue
// @grant 	GM_listValues
// @grant   GM_xmlhttpRequest
// @noframes
// @require       http://localhost:8888/lib/FileSaver.js
// @require       http://localhost:8888/lib/jszip.js
// @require       file:///Users/kazoku/Desktop/code/mypo.user.js
// x@require      http://localhost:8888/mypo.user.js
// ==/UserScript==
// @include *
// @homepageURL  https://gist.github.com/esabox/e168594e77f35c6e18e4b5ecbe4272c0/edit
// @downloadURL  https://gist.github.com/esabox/e168594e77f35c6e18e4b5ecbe4272c0/raw/mbpR13Late.user.js
// @connect      localhost:8888
/*
let zip = new JSZip();
console.log(zip)
console.log("tag load")

let s = document.createElement( 'script' );
s.type = 'text/javascript';
s.src = ( 'http://localhost:8888/mypo.user.js'); //+"?"+Date.now() //引数あるとvscodeで止まらない、logの行数だけは移動できた。
document.body.appendChild( s );

gistにあげようとしたら、二段階認証がめんどくてcodepenに
*/