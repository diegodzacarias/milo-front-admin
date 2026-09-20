import{d as r}from"./index-BJTEoQNp.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n=r("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);async function o(t,s){const e=await t.text();if(e)try{const a=JSON.parse(e);return{status:a.status??t.status,error:a.error??t.statusText,message:a.message??s,path:a.path,requestId:a.requestId,details:a.details,timestamp:a.timestamp}}catch{return{status:t.status,error:t.statusText,message:e}}return{status:t.status,error:t.statusText,message:s}}function u(t,s){return{status:0,error:"Client Error",message:t instanceof Error?t.message:s}}function c(t,s){return t&&typeof t=="object"&&"status"in t&&"message"in t?t:u(t,s)}export{n as L,c as n,o as r,u as t};
