"""Exercise actual migration constraints and the version-selection query."""
import pathlib, sqlite3, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class MemoryPersistence(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:')
  for file in sorted((ROOT/'drizzle').glob('*.sql')): self.db.executescript(file.read_text())
 def insert(self,user,version,body):
  self.db.execute('INSERT INTO memory_records VALUES (?,?,?,?,?,?,?,?,?,?,?)',(user,'same-record',version,'intent','CTM','Thesis',body,'accepted','{}','2026-09-09','user'))
 def test_version_conflicts_preserve_prior_text_and_tenant_scope(self):
  self.insert('alice',1,'Original NOT funded');self.insert('alice',2,'Corrected assumption');self.insert('bob',1,'Private bob note')
  with self.assertRaises(sqlite3.IntegrityError):self.insert('alice',2,'Stale overwrite')
  current=self.db.execute('SELECT body FROM memory_records m WHERE user_id=? AND version=(SELECT MAX(version) FROM memory_records n WHERE n.user_id=m.user_id AND n.id=m.id)',('alice',)).fetchall()
  self.assertEqual(current,[('Corrected assumption',)])
  self.assertEqual(self.db.execute('SELECT body FROM memory_records WHERE user_id=? AND version=1',('alice',)).fetchone()[0],'Original NOT funded')
 def test_budget_reservations_cannot_overbook(self):
  self.db.execute('INSERT INTO agent_budget VALUES (?,?,0,0)',('alice','2026-09-09'))
  q='UPDATE agent_budget SET reserved=reserved+?,calls=calls+1 WHERE user_id=? AND day=? AND reserved+?<=? RETURNING reserved'
  self.assertEqual(self.db.execute(q,(120000,'alice','2026-09-09',120000,120000)).fetchone(),(120000,))
  self.assertIsNone(self.db.execute(q,(120000,'alice','2026-09-09',120000,120000)).fetchone())
 def test_event_dedupe_survives_worker_restarts(self):
  q='INSERT INTO monitor_events VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,dedupe_key) DO NOTHING'
  for i in range(2):self.db.execute(q,(str(i),'alice','rule','rule:1:2026-09-09','CTM','signal','new','2026-09-09'))
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM monitor_events').fetchone()[0],1)
if __name__=='__main__':unittest.main()
