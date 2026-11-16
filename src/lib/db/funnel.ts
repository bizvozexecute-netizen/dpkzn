import { leadsDb } from "./leads";
import type { FunnelVisit } from "../funnel-visit";

export function saveVisit(v: FunnelVisit) {
  leadsDb.$client.prepare(`INSERT INTO funnel_visits(id,started_at,landing,source,medium,campaign)
    VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).run(v.id,new Date().toISOString(),v.landing,v.source,v.medium,v.campaign);
}

export interface FunnelRow { landing: string; source: string; medium: string; campaign: string;
  visits: number; converted: number; enquiries: number; booked: number }

export function funnelReport(days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const db = leadsDb.$client;
  // Attribute each phone to its earliest confirmed, trackable contact in the selected cohort.
  const rows = db.prepare(`WITH cohort AS (SELECT * FROM funnel_visits WHERE started_at>=?),
    evidence AS (
      SELECT l.phone,l.id,l.visit_id,l.created_at AS time FROM leads l JOIN cohort c ON c.id=l.visit_id WHERE l.origin='site'
      UNION ALL
      SELECT l.phone,l.id,t.visit_id,t.confirmed_at FROM contact_touches t JOIN leads l ON l.id=t.lead_id
      LEFT JOIN cohort c ON c.id=t.visit_id WHERE c.id IS NOT NULL OR (t.visit_id IS NULL AND t.confirmed_at>=?)
    ), converted_visits AS (SELECT DISTINCT visit_id FROM evidence WHERE visit_id IS NOT NULL), ranked AS (
      SELECT *,ROW_NUMBER() OVER(PARTITION BY phone ORDER BY visit_id IS NULL,time,id,visit_id) AS seq
      FROM evidence WHERE phone IS NOT NULL AND phone!=''
    ), people AS (
      SELECT r.visit_id,COUNT(*) AS n,SUM(EXISTS(SELECT 1 FROM leads b WHERE b.phone=r.phone AND b.booked_at>=
        (SELECT MIN(e.time) FROM evidence e WHERE e.phone=r.phone))) AS booked
      FROM ranked r WHERE seq=1 GROUP BY r.visit_id
    )
    SELECT c.landing,c.source,c.medium,c.campaign,COUNT(*) AS visits,COUNT(cv.visit_id) AS converted,
      SUM(COALESCE(p.n,0)) AS enquiries,SUM(COALESCE(p.booked,0)) AS booked
    FROM cohort c LEFT JOIN people p ON p.visit_id=c.id LEFT JOIN converted_visits cv ON cv.visit_id=c.id GROUP BY c.landing,c.source,c.medium,c.campaign
    UNION ALL SELECT 'Без страницы','Источник не установлен','','',0,0,n,booked FROM people WHERE visit_id IS NULL
    ORDER BY booked DESC,enquiries DESC,visits DESC`).all(since,since) as FunnelRow[];
  return rows;
}

export function contactReport(days: number) {
  const since = new Date(Date.now()-days*86400000).toISOString();
  return leadsDb.$client.prepare(`SELECT t.channel,COUNT(DISTINCT CASE WHEN t.clicked_at>=? THEN t.code END) AS clicks,
    COUNT(DISTINCT CASE WHEN t.confirmed_at>=? THEN l.phone END) AS clients,
    COUNT(DISTINCT CASE WHEN t.confirmed_at>=? AND EXISTS(SELECT 1 FROM leads b WHERE b.phone=l.phone AND b.booked_at>=t.confirmed_at) THEN l.phone END) AS booked
    FROM contact_touches t LEFT JOIN leads l ON l.id=t.lead_id
    WHERE t.clicked_at>=? OR t.confirmed_at>=? GROUP BY t.channel ORDER BY clients DESC,clicks DESC`).all(since,since,since,since,since) as
    {channel:string;clicks:number;clients:number;booked:number}[];
}
