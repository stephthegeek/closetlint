"""Permanent deletion with disposable wardrobes only."""
import base64
import contextlib
import io
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime'))
from storage import Store, Archive, WriteConflict, encode, write_version
import deleted_pieces as deleted
from server import Handler
from thumbnails import ThumbnailCache

PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=')

class DeletionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.store=Store(Path(self.tmp.name)/'data');self.instance=self.store.state()['instance']
        self.unique=self.store.upload(PNG);self.shared=self.store.upload(PNG+b'shared');self.orphan=self.store.upload(PNG+b'orphan')
        self.store.set_record('custom','gone',{'name':'Gone','photoId':self.unique,'photos':[{'photoId':self.unique},{'photoId':self.shared}]})
        self.store.set_record('edits','c-gone',{'removed':True,'removedAt':1})
        self.store.set_record('custom','keep',{'name':'Keep','photoId':self.shared})
        self.store.set_record('profile','comfort',{'answers':{'texture':'soft'}})
        self.ids=['c-gone'];self.request='delete-request-123456'
    def tearDown(self):self.tmp.cleanup()
    def preview(self,ids=None):return deleted.preview(self.store,self.instance,self.ids if ids is None else ids)
    def apply(self,plan=None,ids=None,request=None):
        return deleted.apply(self.store,self.instance,self.ids if ids is None else ids,(plan or self.preview(ids))['token'],request or self.request,'delete-permanently')
    def test_preview_reads_only(self):
        before=self.store.verification();p=self.preview();self.assertEqual(p['photoCount'],1);self.assertEqual(p['sharedPhotoCount'],1);self.assertEqual(p['photoBytes'],len(PNG));self.assertEqual(before,self.store.verification())
        self.assertEqual(deleted.inventory(self.store,self.instance)['pieces'],[{'id':'c-gone','reasons':[]}])
    def test_commit_removes_only_selected_and_unshared_photos(self):
        old=self.store.state();r=self.apply();new=self.store.state()
        self.assertNotIn('gone',new['collections']['custom']);self.assertNotIn('c-gone',new['collections']['edits']);self.assertIsNone(self.store.asset(self.unique))
        self.assertIsNotNone(self.store.asset(self.shared));self.assertIsNotNone(self.store.asset(self.orphan))
        self.assertEqual(new['collections']['custom']['keep'],old['collections']['custom']['keep']);self.assertEqual(new['collections']['profile']['comfort'],old['collections']['profile']['comfort'])
        self.assertEqual(r['cacheIds'],[self.unique]);self.assertEqual(r['pieceCount'],1)
    def test_protection_contexts(self):
        for col in ['outfits','outfitHistory','trips','drafts']:
            with self.subTest(col=col):
                self.store.set_record(col,'used',{'pieces':[{'id':'c-gone'}]})
                with self.assertRaises(WriteConflict):self.preview()
                self.store.delete_record(col,'used')
        self.store.set_board({'pieces':[{'id':'c-keep'}],'workspace':{'drafts':[{'board':{'pieces':[{'id':'c-gone'}]}}]}})
        with self.assertRaises(WriteConflict):self.preview()
    def test_own_wear_log_and_collection_protect(self):
        for value in [{'wears':['2026-11-03']},{'wearLog':['2026-11-03']}]:
            self.store.set_record('edits','c-gone',{'removed':True,**value})
            with self.assertRaises(WriteConflict):self.preview()
        self.store.set_record('edits','c-gone',{'removed':True});self.store.set_record('profile','collection-test',{'kind':'piece-collection','ids':['c-gone']})
        with self.assertRaises(WriteConflict):self.preview()
        self.store.set_record('profile','collection-test',{'kind':'piece-collection','ids':['c-gone'],'deleted':True});self.preview()
    def test_ratings_alone_do_not_block(self):
        self.store.set_record('ratings','old',{'ids':['c-gone','c-keep'],'r':1});self.preview()
    def test_source_photo_and_urls_are_retained(self):
        self.store.set_record('profile','retained',{'sourcePhotoId':self.unique});p=self.preview();self.assertEqual(p['photoCount'],0)
        self.store.delete_record('profile','retained');self.store.set_record('custom','other',{'photo':'/_blob/'+self.unique+'.webp'})
        self.assertEqual(self.preview()['photoCount'],0)
    def test_restored_or_new_reference_blocks_stale_confirmation(self):
        p=self.preview();self.store.set_record('edits','c-gone',{'removed':False})
        with self.assertRaises(WriteConflict):self.apply(p)
        self.store.set_record('edits','c-gone',{'removed':True});p=self.preview();self.store.set_record('outfits','new',{'pieces':[{'id':'c-gone'}]})
        with self.assertRaises(WriteConflict):self.apply(p)
        self.assertIsNotNone(self.store.asset(self.unique))
    def test_any_changed_preview_is_rechecked(self):
        p=self.preview();self.store.set_record('profile','unrelated',{'new':True})
        with self.assertRaises(WriteConflict):self.apply(p)
    def test_lost_acknowledgement_is_idempotent_after_other_changes(self):
        p=self.preview();r=self.apply(p);self.store.set_record('profile','later',{'new':True});revision=self.store.state()['revision']
        self.assertEqual(self.apply(p),r);self.assertEqual(self.store.state()['revision'],revision)
        with self.assertRaises(ValueError):deleted.apply(self.store,self.instance,['c-keep'],p['token'],self.request,'delete-permanently')
    def test_write_failure_rolls_back_catalog_documents_and_assets(self):
        p=self.preview();before=self.store.verification()
        with self.store.connect() as db:db.execute("CREATE TRIGGER fail_delete BEFORE DELETE ON assets BEGIN SELECT RAISE(ABORT,'synthetic');END")
        with self.assertRaises(sqlite3.IntegrityError):self.apply(p)
        self.assertEqual(before,self.store.verification());self.assertNotIn(deleted.LEDGER,self.store.state()['collections']['profile'])
    def test_stale_tabs_cannot_restore_or_reference_purged_piece(self):
        self.apply()
        for col,key,value in [('custom','gone',{'name':'Back'}),('edits','c-gone',{'removed':False}),('outfits','new',{'pieces':[{'id':'c-gone'}]}),('trips','new',{'packing':{'c-gone':True}}),('profile',deleted.LEDGER,{'ids':{}})]:
            with self.subTest(col=col):
                with self.assertRaises((ValueError,WriteConflict)):self.store.set_record(col,key,value)
        with self.assertRaises(WriteConflict):self.store.set_record('custom','different',{'name':'Old draft','photoId':self.unique})
        with self.assertRaises(ValueError):self.store.delete_record('profile',deleted.LEDGER)
        with self.assertRaises(WriteConflict):self.store.set_board({'pieces':[{'id':'c-gone'}]})
        with self.assertRaises(WriteConflict):self.store.commit_wear([{'collection':'edits','id':'c-gone','value':{'wears':['2026-11-03']},'expected':write_version(None)}])
    def test_backup_preserves_deletion_guards(self):
        self.apply();backup=Path(self.tmp.name)/'backup.zip';self.store.export(backup);restored=Store(Path(self.tmp.name)/'restored')
        with contextlib.closing(Archive(backup)) as source:restored.restore(source)
        with self.assertRaises(WriteConflict):restored.set_record('custom','gone',{'name':'Back'})
        self.assertIsNone(restored.asset(self.unique));self.assertIsNotNone(restored.asset(self.shared))
    def test_input_and_instance_checks(self):
        for ids in [[],['c-gone','c-gone'],['c-keep'],[1],['x']*201]:
            with self.subTest(ids=str(ids)[:30]):
                with self.assertRaises((ValueError,WriteConflict)):self.preview(ids)
        with self.assertRaises(ValueError):deleted.preview(self.store,'another',self.ids)
        with self.assertRaises(ValueError):deleted.apply(self.store,self.instance,self.ids,self.preview()['token'],self.request,'yes')
    def legacy(self,alias=False):
        uri='data:image/png;base64,'+base64.b64encode(PNG).decode();keep='data:image/png;base64,'+base64.b64encode(PNG+b'keep').decode();bundle='b'*32
        with self.store.connect() as db:
            db.execute('INSERT INTO assets VALUES (?,?,?)',(bundle,'application/json',encode({'legacy-gone':uri,'legacy-keep':keep}).encode()))
            base={'catalog':[{'id':'legacy-gone','name':'Legacy gone','removed':True},{'id':'legacy-keep','name':'Legacy keep',**({'photoOf':'legacy-gone'} if alias else {})}],'tags':{},'bundles':[bundle]}
            self.store.put_meta(db,'base',base)
        return bundle,uri,keep
    def test_legacy_bundle_removes_only_selected_photograph(self):
        bundle,uri,keep=self.legacy();p=self.preview(['legacy-gone']);self.assertEqual(p['photoCount'],1)
        r=self.apply(p,['legacy-gone']);base=self.store.state()['base'];self.assertEqual([p['id'] for p in base['catalog']],['legacy-keep']);self.assertIsNone(self.store.asset(bundle))
        new=json.loads(self.store.asset(base['bundles'][0])[1]);self.assertEqual(new,{'legacy-keep':keep});self.assertIn('catalog-'+deleted.catalog_id(uri),r['cacheIds'])
    def test_alias_and_saved_catalog_photo_url_keep_legacy_photo(self):
        bundle,uri,keep=self.legacy(alias=True);self.assertEqual(self.preview(['legacy-gone'])['photoCount'],0);self.apply(ids=['legacy-gone']);self.assertIsNotNone(self.store.asset(bundle))
    def test_unknown_legacy_photo_reference_is_kept(self):
        bundle,uri,keep=self.legacy();self.store.set_record('profile','photo',{'url':'/_catalog/'+deleted.catalog_id(uri)});self.assertEqual(self.preview(['legacy-gone'])['photoCount'],0)
    def test_thumbnail_discard_blocks_inflight_index_and_preserves_others(self):
        cache=ThumbnailCache(self.store);cache.folder.mkdir(parents=True);target=cache.folder/(self.unique+'-hash.webp');target.write_bytes(b'old');other=cache.folder/(self.shared+'-hash.webp');other.write_bytes(b'keep')
        cache.index(self.unique,target,100,cache.generation);cache.discard([self.unique]);self.assertIsNone(cache.get_ready(self.unique));self.assertFalse(target.exists());self.assertTrue(other.exists())
        target.write_bytes(b'late-worker');cache.index(self.unique,target,100,cache.generation);self.assertFalse(target.exists());cache.refresh();self.assertNotIn(self.unique,cache.removed)


class Connection:
    def __init__(self,raw):self.input=io.BytesIO(raw);self.output=bytearray()
    def makefile(self,*args,**kwargs):return self.input
    def sendall(self,data):self.output.extend(data)

class DeletionHTTPTests(DeletionTests):
    # Inherit fixture helpers, but HTTP cases run in addition to the storage cases.
    def call(self,body,token=True):
        if not hasattr(self,'server'):
            self.discarded=[]
            self.server=SimpleNamespace(host='127.0.0.1',password=None,store=self.store,token='test-token',server_address=('127.0.0.1',6684),tickets={},mutation_lock=threading.RLock(),thumbnails=SimpleNamespace(discard=lambda ids:self.discarded.extend(ids)))
        raw=encode(body).encode();headers={'Host':'127.0.0.1:6684','Content-Length':str(len(raw)),'Content-Type':'application/json'}
        if token:headers['X-ClosetLint-Token']='test-token'
        request=('POST /api/deleted-pieces HTTP/1.0\r\n'+''.join(k+': '+v+'\r\n' for k,v in headers.items())+'\r\n').encode()+raw
        connection=Connection(request);Handler(connection,('127.0.0.1',1234),self.server);head,data=bytes(connection.output).split(b'\r\n\r\n',1)
        return int(head.split()[1]),json.loads(data)
    def test_http_preview_confirmation_retry_and_auth(self):
        self.assertEqual(self.call({'action':'inventory','instance':self.instance},token=False)[0],403)
        status,inventory=self.call({'action':'inventory','instance':self.instance});self.assertEqual(status,200);self.assertEqual(inventory['pieces'][0]['id'],'c-gone')
        status,plan=self.call({'action':'preview','instance':self.instance,'ids':self.ids});self.assertEqual(status,200)
        body={'action':'delete','instance':self.instance,'ids':self.ids,'token':plan['token'],'request':self.request,'confirm':'delete-permanently'}
        status,receipt=self.call(body);self.assertEqual(status,200);self.assertIn(self.unique,self.discarded);self.assertEqual(self.call(body),(200,receipt));self.assertIsNone(self.store.asset(self.unique))
    def test_http_conflict_does_not_delete(self):
        status,plan=self.call({'action':'preview','instance':self.instance,'ids':self.ids});self.assertEqual(status,200)
        self.store.set_record('edits','c-gone',{'removed':False})
        status,error=self.call({'action':'delete','instance':self.instance,'ids':self.ids,'token':plan['token'],'request':self.request,'confirm':'delete-permanently'})
        self.assertEqual(status,409);self.assertIsNotNone(self.store.asset(self.unique))

if __name__=='__main__':unittest.main()
