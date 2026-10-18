"""Import the verified second batch. Originals are copied unchanged; all edits are derivatives."""
from pathlib import Path
from PIL import Image
from datetime import datetime
import argparse, json, shutil, hashlib

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--source',type=Path,required=True)
args=parser.parse_args()
catalog=ROOT/'dist/data/books.json'
data=json.loads(catalog.read_text())
rows=[
 ('腾讯游戏开发精粹',None,'腾讯游戏','编著','978-7-121-36602-4',79,'175746','175805',1,'约九成新','整体较完整，封面边缘有轻微使用痕迹。',[(.092,.155),(.869,.142),(.930,.866),(.070,.876)],[(.060,.118),(.880,.110),(.907,.855),(.049,.861)]),
 ('腾讯游戏开发精粹Ⅱ',None,'腾讯游戏','著','978-7-121-42290-4',148,'175842','175857',2,'约八五成新','封面与封底可见细小擦痕，边角有轻微磨损。',[(.094,.072),(.898,.063),(.938,.911),(.077,.906)],[(.104,.130),(.841,.126),(.870,.859),(.113,.868)]),
 ('腾讯游戏开发精粹Ⅲ',None,'腾讯游戏','著','978-7-121-48940-2',168,'175941','180012',3,'约八五成新','外观整体完整，封底及边缘有可见擦痕与使用痕迹。',[(.071,.053),(.879,.051),(.900,.850),(.068,.863)],[(.101,.074),(.861,.073),(.909,.876),(.062,.890)]),
 ('游戏设计','筑梦之路·万物肇始','网易互动娱乐事业群','编著','978-7-302-56817-9',128,'181353','181406',1,'约七至八成新','封面及封底有较明显擦痕、折角和边缘磨损。',[(.044,.048),(.924,.048),(.944,.869),(.056,.889)],[(.047,.049),(.924,.056),(.924,.873),(.053,.889)]),
 ('游戏开发','筑梦之路·造物工程','网易互动娱乐事业群','编著','978-7-302-56558-1',168,'181817','181836',2,'约七成新','封面白边擦痕明显，下部及边角有折压与磨损。',[(.052,.052),(.901,.045),(.964,.873),(.038,.878)],[(.067,.068),(.900,.060),(.938,.873),(.059,.878)]),
 ('美术设计','筑梦之路·妙手丹青','网易互动娱乐事业群','编著','978-7-302-56816-2',198,'182017','182035',3,'约七至八成新','封面白边、封底与书角有可见磨痕和折痕。',[(.077,.051),(.917,.049),(.978,.868),(.021,.878)],[(.069,.058),(.929,.065),(.945,.873),(.058,.884)]),
 ('质量保障','筑梦之路·臻于至善','网易互动娱乐事业群','编著','978-7-302-56920-6',118,'182112','182206',4,'约七至八成新','封面白边有明显擦痕，封底及边角有使用磨损。',[(.087,.072),(.906,.066),(.955,.866),(.070,.870)],[(.057,.037),(.935,.035),(.964,.884),(.048,.885)]),
 ('用户体验','筑梦之路·上善若水','网易互动娱乐事业群','编著','978-7-302-56921-3',188,'182225','182239',5,'约七至八成新','封面边缘有灰色擦痕与折角，封底表面及边缘有磨损。',[(.063,.080),(.911,.059),(.962,.873),(.059,.891)],[(.100,.082),(.928,.075),(.953,.888),(.091,.882)]),
 ('项目管理','筑梦之路·推演妙算','网易互动娱乐事业群','编著','978-7-302-56818-6',118,'182447','182458',6,'约七成新','封面白边擦痕较明显，封底及书角有多处使用痕迹。',[(.082,.048),(.943,.042),(.971,.881),(.055,.871)],[(.073,.088),(.906,.068),(.928,.878),(.069,.875)]),
 ('美术画册','筑梦之路·游生绘梦','网易互动娱乐事业群','编著','978-7-302-56943-5',398,'182554','182632',7,'约六五至七成新','横版书，封面、封底及书脊有磨损，右侧书角折压和破损较明显。',[(.082,.054),(.956,.070),(.958,.843),(.064,.839)],[(.075,.052),(.944,.085),(.957,.882),(.041,.814)])
]
data['schemaVersion']=2
data['seriesGroups']=[
 {'id':'tencent-game-development','title':'腾讯游戏开发精粹系列','shortTitle':'腾讯游戏开发精粹','kind':'同名书系归组','description':'按书名归组，依第Ⅰ、Ⅱ、Ⅲ册排列；已藏册数不代表该书系出版总数。'},
 {'id':'netease-game-academy','title':'网易游戏学院·游戏研发入门系列丛书','shortTitle':'网易游戏学院','kind':'封面标示丛书','description':'封面编号 NO.01—NO.07；每册独立编目，已藏册数不代表已确认集齐全部出版物。'}
]
existing={b['isbn'].replace('-',''):b['id'] for b in data['books']}
seen_photos={}
for b in data['books']:
 for p in b['photos']:
  f=ROOT/'dist'/p['original']
  seen_photos[hashlib.sha256(f.read_bytes()).hexdigest()]=b['id']
for idx,row in enumerate(rows,start=4):
 title,subtitle,author,role,isbn,price,front,back,number,condition,note,fc,bc=row
 bid=f'LC-{idx:06d}'
 if any(b['id']==bid for b in data['books']):
  assert next(b for b in data['books'] if b['id']==bid)['isbn']==isbn
  continue
 assert isbn.replace('-','') not in existing,f'Same ISBN already catalogued: {title}'
 is_tencent=idx<7
 group=data['seriesGroups'][0 if is_tencent else 1]
 target=ROOT/'dist/assets'/bid;target.mkdir(parents=True,exist_ok=True)
 landscape=title=='美术画册'
 photos=[]
 for side,suffix,corners in [('front',front,fc),('back',back,bc)]:
  source=args.source/f'IMG_20261018_{suffix}.jpg'
  digest=hashlib.sha256(source.read_bytes()).hexdigest()
  assert digest not in seen_photos,f'Exact photograph already present: {source.name}'
  seen_photos[digest]=bid
  original=target/f'{side}-original.jpg';shutil.copy2(source,original)
  im=Image.open(source).convert('RGB');w,h=im.size
  pts=[(x*w,y*h) for x,y in corners]
  quad=tuple(v for i in (0,3,2,1) for v in pts[i])
  dimensions=(1120,800) if landscape else (800,1160)
  display=im.transform(dimensions,Image.Transform.QUAD,quad,Image.Resampling.BICUBIC)
  display.save(target/f'{side}.webp','WEBP',quality=88)
  if side=='front':
   thumb=display.copy();thumb.thumbnail((560,580),Image.Resampling.LANCZOS)
   thumb.save(target/'thumbnail.webp','WEBP',quality=85)
  photos.append({'side':side,'label':'正面' if side=='front' else '背面','file':f'assets/{bid}/{side}.webp','original':f'assets/{bid}/{side}-original.jpg','sourceFilename':source.name,'capturedAt':f'2026-10-18T{suffix[:2]}:{suffix[2:4]}:{suffix[4:]}+08:00','timeSource':'文件名；照片水印核对至分钟','sha256':digest,'displayWidth':dimensions[0],'displayHeight':dimensions[1]})
 tags=['游戏开发','程序技术','研发实践'] if is_tencent else {'游戏设计':['游戏策划','游戏设计'],'游戏开发':['程序技术','研发实践'],'美术设计':['游戏美术','视觉设计'],'质量保障':['游戏测试','QA'],'用户体验':['交互设计','用户研究'],'项目管理':['研发管理','项目管理'],'美术画册':['游戏美术','画册','概念设计']}[title]
 b={'id':bid,'title':title,'subtitle':subtitle,'authors':[{'name':author,'role':role}],'translators':[],'publisher':'电子工业出版社' if is_tencent else '清华大学出版社','isbn':isbn,'category':'游戏设计与研发','tags':tags,'series':group['title'],'seriesGroupId':group['id'],'seriesNumber':number,'seriesLabel':f'第{number}册' if is_tencent else f'NO.{number:02d}','purchaseGroupId':None,'orientation':'landscape' if landscape else 'portrait','coverEditionLabel':None,'publicationDate':None,'edition':None,'listPrice':float(price),'paidPrice':None,'currency':'CNY','purchaseDate':None,'purchaseDatePrecision':None,'purchaseChannel':None,'accessionedAt':photos[0]['capturedAt'],'accessionRule':'首张正面照片的拍摄时间','readingStatus':None,'location':None,'notes':None,'description':f'腾讯游戏开发精粹系列第{number}册。' if is_tencent else f'网易游戏学院游戏研发入门系列丛书 {number:02d}，主题为{title}。','metadataSource':'自有实体书正反面照片；分类与标签为个人编目','photos':photos,'condition':{'label':condition,'note':note,'scope':'外观','source':'正反面照片预估','assessedOn':'2026-10-18','limitations':'未检查内页、装订牢固度、缺页、笔记及霉斑等情况。'}}
 data['books'].append(b);existing[isbn.replace('-','')]=bid
assert len(data['books'])==13
assert sum(b['listPrice'] for b in data['books'])==1820
catalog.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'books':len(data['books']),'seriesGroups':len(data['seriesGroups']),'photos':sum(len(b['photos']) for b in data['books']),'listPriceTotal':1820,'duplicatesFound':0},ensure_ascii=False))
