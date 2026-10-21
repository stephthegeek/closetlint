#!/usr/bin/env python3
"""Create an isolated synthetic wardrobe with bundled AI-generated photos; standard library only."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'runtime'))
from storage import COLLECTIONS, Store, validate_payload


def demo_source():
    rows = [
        ('Black everyday tee','Tops','Tees','top','black','353b3a',False),
        ('Burgundy cotton top','Tops','Tees','top','burgundy','793f51',False),
        ('Black straight trousers','Bottoms','Pants','bottom','black','353b3a',False),
        ('Blue straight jeans','Bottoms','Jeans','bottom','blue','67899b',False),
        ('Beige midi skirt','Bottoms','Skirts','skirt','beige','c6b498',False),
        ('Black day dress','One-pieces','Dresses','dress','black','353b3a',False),
        ('Beige cardigan','Tops','Sweaters','top','beige','c6b498',False),
        ('White sneakers','Footwear','Sneakers','shoes','white','deded3',False),
        ('Black ankle boots','Footwear','Boots','shoes','black','353b3a',False),
        ('Silver necklace','Jewelry','Necklaces','necklace','silver','9caaa9',False),
        ('Burgundy wishlist blouse','Tops','Blouses & fashion tops','top','burgundy','834052',True),
        ('Black wishlist skirt','Bottoms','Skirts','skirt','black','353b3a',True),
    ]
    photo_dir = ROOT / "app/assets/demo"
    photo_info = json.loads((photo_dir / "provenance.json").read_text())["images"]
    assets={}; catalog=[]
    for i,(name,meta,sub,shape,color,hex_color,wish) in enumerate(rows):
        photo = photo_info[i]
        image=(photo_dir / photo["file"]).read_bytes()
        asset_id=hashlib.sha256(image).hexdigest()[:32]
        assets[asset_id]=image
        piece={'id':f'demo-{i+1:02}', 'name':name, 'meta':meta,'sub':sub,
               'colors':[color], 'seasons':['spring','summer','fall','winter'],
               'styles':['casual'], 'looks':['classic'], 'fits':['relaxed'],
               'pattern':['solid'], 'statement':'plain', 'size':'M','sizeKind':'clothing',
               'photoId':asset_id,'ar':photo['width']/photo['height'],'source':'Synthetic sample','genericPhoto':True,
               'photos':[{'photoId':asset_id,'ar':photo['width']/photo['height'],'kind':'isolated','width':photo['width'],'height':photo['height'],'generated':True}],
               'date':'2026-01-01'}
        if shape=='shoes':piece.update(size='8',sizeKind='shoe')
        if shape in ('bag','necklace'):piece.update(size='One size',sizeKind='onesize')
        if name.endswith('cardigan'):piece.update(kind='cardigan',labAs='layer')
        if wish:piece['wish']=True
        catalog.append(piece)
    cols={col:{} for col in COLLECTIONS}
    cols['views']['_seeded']={'at':1}
    cols['profile']['demo']={'synthetic':True}
    # A release-ready fictional collection, independent of StephTheGeek's personal wardrobe.
    sample_ids=[piece['id'] for piece in catalog]
    cols['profile']['collection-imaginary']={
        'kind':'piece-collection','name':"Linty's imaginary closet",
        'description':'Twelve fictional pieces to play with. AI-generated photos, clothes, and wishlist picks are all made up.',
        'ids':sample_ids,'deleted':False}

    ids_by_name={piece['name']:piece['id'] for piece in catalog}
    pieces=[{'id':ids_by_name['Black everyday tee'],'x':10,'y':12,'w':34,'z':1},{'id':ids_by_name['Blue straight jeans'],'x':52,'y':18,'w':31,'z':2}]
    cols['outfits']['demo-look']={'name':'An everyday starting point','pieces':pieces,'from':'sample','updatedAt':1}
    payload={'app':'closet-lint','kind':'full-backup','formatVersion':1,
             'collections':cols,'base':{'catalog':catalog,'tags':{},'bundles':[]},
             'board':{'name':'Try rearranging these pieces','pieces':pieces}}
    class Source:
        def read_asset(self,key):return self.assets[key]
    source=Source();source.payload=payload;source.assets=assets
    source.summary=validate_payload(payload,assets)
    return source


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,required=True,help='A separate private data folder outside the repository')
    args=parser.parse_args()
    if args.data.resolve().is_relative_to(ROOT):parser.error('Keep generated wardrobe data outside the repository.')
    source=demo_source()
    try:
        Store(args.data).restore(source)  # Never replace a nonempty instance.
    except ValueError as error:
        parser.error(str(error))
    print('Created synthetic sample:',len(source.payload['base']['catalog']),'pieces,',len(source.assets),'AI-generated product photos.')
    print('Start with: python3 runtime/server.py --data YOUR_SAMPLE_FOLDER')


if __name__=='__main__':main()
