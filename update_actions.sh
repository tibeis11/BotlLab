sed -i.bak 's/const { data: recentScan } = await supabase/const adminClient = createAdminClient();\n      const { data: recentScan } = await adminClient/g' lib/actions/beat-the-brewer-actions.ts
sed -i.bak 's/const { data: recentVibeScan } = await supabase/const adminClient = createAdminClient();\n      const { data: recentVibeScan } = await adminClient/g' lib/actions/beat-the-brewer-actions.ts
sed -i.bak 's/const { error: updateErr } = await (supabase as any)/const adminClient = createAdminClient();\n    const { error: updateErr } = await (adminClient as any)/g' lib/actions/bottle-status-actions.ts
sed -i.bak 's/await (supabase as any)\n *\.from('"'"'bottle_scans'"'"')\n *\.update/await (adminClient as any).from('"'"'bottle_scans'"'"').update/g' lib/actions/beat-the-brewer-actions.ts
