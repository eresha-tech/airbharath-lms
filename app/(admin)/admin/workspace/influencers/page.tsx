import {redirect} from 'next/navigation';
import {getAuthorizedAdminSession} from '@/lib/admin-authorization';
import {listInfluencers} from '@/lib/workspace/membership/influencers';
import {InfluencerDirectory} from '@/components/admin/InfluencerDirectory';
export default async function Page(){const a=await getAuthorizedAdminSession();if(!a)redirect('/login');const rows=await listInfluencers(a.id);return <div className="space-y-6"><h1 className="font-outfit text-3xl font-semibold">Influencers</h1><InfluencerDirectory initial={rows}/></div>;}
