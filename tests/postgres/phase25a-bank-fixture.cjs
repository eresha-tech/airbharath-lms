// Test-only prerequisite for legacy payout regression fixtures: obtain synthetic FAV evidence before dispatch.
module.exports=async({load,db,actor,payeeId,config,read,write})=>{
 const {randomUUID}=require('node:crypto'),{createBankTransport}=require('./phase25a-bank-provider.cjs');
 const c={payout:config,mode:'synthetic',method:'pennydrop',amount:100,minIntervalSeconds:0,enabled:true,policy:'mandatory-fav-v1'};
 await db.transaction(tx=>load('@/lib/creator-payments/bank-validation/service').requestBankValidation(tx,actor,payeeId,randomUUID(),c));
 const adapter=load('@/lib/creator-payments/bank-validation/adapter').bankValidationAdapter(c,createBankTransport(read,write));
 await load('@/lib/creator-payments/bank-validation/worker').runBankValidationWorker(db,c,adapter,10);
};
