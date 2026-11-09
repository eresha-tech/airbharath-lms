const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const initial=()=>({orders:{},payments:{}});
function createTransport(read,write){return async(input,init={})=>{
 const url=new URL(input);assert.equal(url.origin,'https://api.razorpay.com');assert.equal(init.redirect,'error');const route=url.pathname.replace('/v1/',''),s=read(),body=init.body?JSON.parse(init.body):null;
 const reply=(r,status=200)=>{write(s);return Response.json(r,{status});};
 if(init.method==='POST'&&route==='orders'){const r={...body,id:'order_'+randomUUID().replaceAll('-',''),status:'created',created_at:Math.floor(Date.now()/1000)};s.orders[r.id]=r;return reply(r);}
 if(route==='orders')return reply({items:Object.values(s.orders)});
 if(route.startsWith('orders/')&&route.endsWith('/payments'))return reply({items:Object.values(s.payments).filter(p=>p.order_id===route.split('/')[1])});
 if(route.startsWith('orders/'))return reply(s.orders[route.split('/')[1]]??{},s.orders[route.split('/')[1]]?200:404);
 if(route.startsWith('payments/')&&route.endsWith('/refunds'))return reply({items:[]});
 if(route.startsWith('payments/'))return reply(s.payments[route.split('/')[1]]??{},s.payments[route.split('/')[1]]?200:404);
 throw Error('Unexpected synthetic membership transport route');
};}
module.exports={initial,createTransport};
