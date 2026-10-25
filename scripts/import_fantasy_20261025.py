"""Import three fantasy trilogies; shared ISBNs/prices represent sets, not duplicates."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);args=p.parse_args();root=Path(__file__).resolve().parents[1];path=root/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==46
rows=[
('dark-elf-trilogy','黑暗精灵三部曲','故土','Homeland','125532','125541','7-80111-992-4',None,['朱学恒'],'龙门书局'),
('dark-elf-trilogy','黑暗精灵三部曲','流亡','Exile','125611','125620','7-80111-992-4',None,['徐庆雯'],'龙门书局'),
('dark-elf-trilogy','黑暗精灵三部曲','旅居','Sojourn','125636','125645','7-80111-992-4',None,['吴宜洁','欧威扬'],'龙门书局'),
('icewind-dale-trilogy','冰风谷','碎魔晶','The Crystal Shard','125713','125721','7-80145-526-6',None,['洪岳农'],'光明日报出版社'),
('icewind-dale-trilogy','冰风谷','白银溪流','Streams of Silver','125732','125739','7-80145-526-6',None,['王中宁'],'光明日报出版社'),
('icewind-dale-trilogy','冰风谷','半身人的魔坠',"The Halfling’s Gem",'125810','125829','7-80145-526-6',None,['王中宁'],'光明日报出版社'),
('warcraft-ancients','魔兽 · 上古之战三部曲','永恒之井','The Well of Eternity','125915','125927','7-80676-903-X',20,['张尧臣','龚镇'],'文汇出版社'),
('warcraft-ancients','魔兽 · 上古之战三部曲','恶魔之魂','The Demon Soul','130352','130408','7-80676-967-6',22,['黄志旻','陈琳','朱粒平','王草青'],'文汇出版社'),
('warcraft-ancients','魔兽 · 上古之战三部曲','天崩地裂','The Sundering','130502','130510','7-80741-020-5',23,['赵永健','余美'],'文汇出版社')]
new=[]
for index,(gid,series,sub,original,front,back,isbn,price,trans,publisher) in enumerate(rows):
 ident=f'LC-{index+47:06}';n=index%3+1;war=index>=6
 if n==1:d['seriesGroups'].append(dict(id=gid,title=series,shortTitle=series,kind='三部曲',description='按实体书分册顺序排列，每册保留独立照片与档案。'))
 photos=[]
 for stamp,side,label in [(front,'front','正面'),(back,'back','背面')]:
  src=args.source/f'IMG_20261025_{stamp}.jpg';dest=root/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest);w,h=Image.open(src).size;rel=dest.relative_to(root/'dist').as_posix();new.append(dest.relative_to(root).as_posix());photos.append(dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，水印核对至分钟；无可读取 EXIF 时间',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 d['books'].append(dict(id=ident,title=(series if not war else "魔兽·上古之战三部曲"),originalTitle=original,subtitle=sub,authors=[dict(name='理查德·A.纳克' if war else 'R.A.萨尔瓦多',originalName='Richard A. Knaak' if war else 'R. A. Salvatore',country='美国',role='著')],translators=trans,publisher=publisher,isbn=isbn,isbnScope=None if war else '全三册共用 ISBN',category='文学与小说',tags=['奇幻小说','魔兽' if war else '被遗忘的国度'],usageTags=['世界观参考','角色塑造','叙事参考'],language='zh-Hans',languageLabel='中文译本',series=series,seriesGroupId=gid,seriesNumber=n,seriesLabel=f'第{n}部',physicalSetId=None if war else gid,purchaseGroupId=None,priceGroupId=None if war else gid+'-price',orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes='封面与封底记载，具体版次、印次未核对。',description=None,metadataSource='用户上传的实体书正反面照片',photos=photos,condition=dict(label='有使用痕迹',note='封面与封底可见擦痕、折痕或边角磨损；未检查内页和装订。',scope='外观',source='照片预估',assessedOn='2026-10-25')))
for gid,amount,label,start in [('dark-elf-trilogy',54,'黑暗精灵三部曲（全三册）',47),('icewind-dale-trilogy',72,'冰风谷（全三册）',50)]:
 d['priceGroups'].append(dict(id=gid+'-price',label=label,amount=amount,currency='CNY',bookIds=[f'LC-{i:06}' for i in range(start,start+3)],source='三册封底均明确标示全三册定价，合计仅计一次'))
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');Path('/workspace/scratch/d7434e3573fb/batch25b-paths.json').write_text(json.dumps(new));print('Imported 9 books and 18 photos')
