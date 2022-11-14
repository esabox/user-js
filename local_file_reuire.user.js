// ==UserScript==
// @name           @req file:///userjs
// @description fileプロトコルで@require
// @namespace    https://gist.github.com/esabox/
// @updateURL     https://github.com/esabox/user.js/raw/master/local_file_reuire.user.js
// @downloadURL https://github.com/esabox/user.js/raw/master/local_file_reuire.user.js
// @version      2022-11-14
// @author       nank
// @match        *://*/*
// @exclude      ^https://codepen.io/*
// @exclude     https://docs.google.com/*
// @grant	GM_registerMenuCommand
// @grant 	GM_getValue
// @grant 	GM_setValue
// @grant 	GM_deleteValue
// @grant 	GM_listValues
// @grant   GM_xmlhttpRequest
// @noframes
// @require       file:///Users/kazoku/Desktop/code/mypo.user.js
// ==/UserScript==

// x@require      http://localhost:8888/mypo.user.js
// if(globalThis.endFlag )return;
// import('http://localhost:8888/mypo.user.js')
// 		.then(() => {
// 			console.log(111)
// 		})
//require ローカルで、無ければネット
// if(window.end)return ;
// !function(){
//     const main = function() {
//         alert('main')
//     }
//     main()
// }()
// window.end=1
