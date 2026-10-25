"""Import seven books with cover, back-cover and supplementary interior photographs."""
import argparse,hashlib,json,shutil
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];path=root/'dist/data/books.json';data=json.loads(path.read_text());assert len(data['books'])==39
new=[]
def photo(ident,stamp,side,label):
 src=args.source/f'IMG_20261025_{stamp}.jpg';dest=root/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
 rel=dest.relative_to(root/'dist').as_posix();w,h=Image.open(src).size;new.append(dest.relative_to(root).as_posix())
 return dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='拍摄文件名精确至秒，照片水印核对至分钟；无可读取 EXIF 时间',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h)
def book(i,title,authors,category,isbn,price,publisher,shots,**extra):
 ident=f'LC-{i:06}';photos=[photo(ident,*s) for s in shots]
 b=dict(id=ident,title=title,subtitle=None,authors=authors,translators=[],publisher=publisher,isbn=isbn,category=category,tags=extra.pop('tags',[]),usageTags=extra.pop('usageTags',['资料参考']),language='zh-Hans',languageLabel='中文',series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes=None,description=None,metadataSource='用户上传的实体书封面、封底及补充内页照片',photos=photos,condition=extra.pop('condition',None));b.update(extra);data['books'].append(b)
book(40,'偶像的黄昏',[dict(name='尼采',country='德国',role='著')],'人文与社科','978-7-100-10384-8',22,'商务印书馆',[('125053','front','正面'),('125104','back','背面')],series='汉译世界学术名著丛书',tags=['哲学','尼采'],usageTags=['思想参考'],condition=dict(label='约九成新',note='封面与封底较完整，边角可见轻微使用痕迹。',scope='外观',source='照片预估',assessedOn='2026-10-25'))
book(41,'中华人民共和国民法典',[dict(name='中国法制出版社',role='编')],'人文与社科','978-7-5216-1017-8',18,'中国法制出版社',[('125140','front','正面'),('125203','copyright','版权信息补充内页')],tags=['法律','民法典'],usageTags=['法律参考'],notes='补充照片为内页透印的版权信息与条码；未提供独立封底照片。具体印次未录入。',condition=dict(label='有明显破损',note='封面右上角可见缺损与撕裂，其他外观以照片为准。',scope='外观',source='照片预估',assessedOn='2026-10-25'))
book(42,'零 ZERRO：世界符号大全',[dict(name='松田行正',country='日本',role='著')],'游戏与设计',None,None,'中央编译出版社',[('125239','front','正面'),('125247','back','背面'),('125320','title-page','扉页')],originalTitle='ZERRO',titleAliases=['ZERRO','零','ZEЯRO','零ZERRO','世界符号大全'],tags=['符号','视觉设计'],usageTags=['美术参考','设计参考'],notes='书名与作者根据封面及扉页；ISBN、定价、译者和具体版次未从本批照片确认。',condition=dict(label='有明显磨损',note='黑色封面与封底可见多处擦痕及边角磨损。',scope='外观',source='照片预估',assessedOn='2026-10-25'))
gid='oz-four-volume';data['seriesGroups'].append(dict(id=gid,title='绿野仙踪 · 四集本',shortTitle='绿野仙踪（四集本）',kind='四册合集',description='依据封面“共四集”按第一至第四集编目，每册独立记录封底 ISBN 和定价。'))
for n,(front,back,isbn,price) in enumerate([('125335','125347','7-5327-1335-0',8.10),('125405','125412','7-5327-1336-9',7.50),('125424','125433','7-5327-1337-7',7.40),('125446','125455','7-5327-1338-5',8.35)],1):
 book(42+n,'绿野仙踪',[dict(name='弗兰克·鲍姆',country='美国',role='著')],'文学与小说',isbn,price,None,[(front,'front','正面'),(back,'back','背面')],subtitle=f'第{n}集',series='绿野仙踪',seriesGroupId=gid,seriesNumber=n,seriesLabel=f'第{n}集',physicalSetId=gid,tags=['童话','奥芝国'],usageTags=['世界观参考','叙事参考'],notes='按封底保留原印 ISBN-10；译者、出版社与出版版次未从本批照片确认。',condition=dict(label='有明显岁月痕迹',note='封面与封底可见泛黄、污迹、擦痕及书脊边角磨损；未检查内页和装订。',scope='外观',source='照片预估',assessedOn='2026-10-25'))
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');Path('/workspace/scratch/d7434e3573fb/batch25-paths.json').write_text(json.dumps(new));print('Imported 7 books, 15 photos')
