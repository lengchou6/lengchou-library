"""Import 13 physical books from 28 cover, back and copyright-page photographs."""
import argparse,json,hashlib,shutil
from pathlib import Path
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];path=r/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==100
# Metadata transcribed from the actual photographs, not from another edition.
rows=[
('死灵之书','H.P.洛夫克拉夫特小说全集','H.P.洛夫克拉夫特','北京时代华文书局','978-7-5699-2332-2',198,'231409','234011',None,'文学与小说','收录洛夫克拉夫特的恐怖与奇幻小说，呈现克苏鲁神话相关的想象世界。'),
('一句顶一万句',None,'刘震云','花城出版社','978-7-5360-9726-1',68,'234130','234138',None,'文学与小说','围绕人与人之间的交流、孤独及寻找能说得上话的人展开的长篇小说。'),
('女孩别怕','为女孩生活，提供安全方案','田静、女孩别怕团队','中信出版集团','978-7-5217-2290-1',49.8,'234148','234157',None,'人文与社科','围绕日常生活、亲密关系、网络与职场等场景，介绍女性安全与自我保护相关知识。'),
('人生没什么不可放下','弘一法师的人生智慧','宋默','团结出版社','978-7-5126-2245-6',32.8,'234207','234219',None,'人文与社科','围绕弘一法师的生活与思想，讨论取舍、心境和日常处世。'),
('生死疲劳',None,'莫言','浙江文艺出版社','978-7-5339-6610-2',69.9,'234957','235016','235011','文学与小说','借轮回叙述乡土社会中人与土地的关系，以及时代变迁中的个人与家庭。'),
('丰乳肥臀',None,'莫言','浙江文艺出版社','978-7-5339-6021-6',69,'235036','235048',None,'文学与小说','以母亲与家庭的命运为中心，书写历史变迁中的苦难、生存与生命韧性。'),
('蛙',None,'莫言','浙江文艺出版社','978-7-5339-6024-7',49,'235059','235110',None,'文学与小说','通过乡村妇产科医生的人生，书写生育、时代与个人伦理之间的矛盾。'),
('人间小满',None,'姑苏阿焦','中国水利水电出版社','978-7-5226-0906-5',58,'235140','235147',None,'文学与小说','从日常生活出发，谈知足、分寸与平常日子中的安宁和欢喜。'),
('我与地坛',None,'史铁生','人民文学出版社','978-7-02-008435-7',29,'235204','235211',None,'文学与小说','史铁生的散文作品，围绕生命、亲情、记忆与个人处境展开思索。'),
('皮囊',None,'蔡崇达','天津人民出版社','978-7-201-08894-5',39.8,'235220','235245','235236','文学与小说','以故乡、亲人与成长经历为线索，记录普通人的生活与精神世界。'),
('三体',None,'刘慈欣','重庆出版社','978-7-5366-9293-0',23,'235318','235324',None,'文学与小说','地球往事三部曲第一部，从人类与外星文明的接触展开文明命运的故事。'),
('三体Ⅱ','黑暗森林','刘慈欣','重庆出版社','978-7-5366-9396-8',32,'235337','235347',None,'文学与小说','地球往事三部曲第二部，围绕文明间的生存困境与人类应对展开。'),
('三体Ⅲ','死神永生','刘慈欣','重庆出版社','978-7-229-03093-3',38,'235358','235408',None,'文学与小说','地球往事三部曲第三部，将人类与文明命运的叙事延伸到更广阔的宇宙尺度。')]
paths=[]
for i,row in enumerate(rows,101):
 title,sub,author,publisher,isbn,price,front,back,inside,category,description=row;ident=f'LC-{i:06}';photos=[]
 sources=[(front,'front','正面'),(back,'back','背面')]+([(inside,'copyright','版权页')] if inside else [])
 for stamp,side,label in sources:
  src=a.source/f'IMG_20261027_{stamp}.jpg';dest=r/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
  with Image.open(src) as im:w,h=im.size
  rel=dest.relative_to(r/'dist').as_posix();paths.append(dest.relative_to(r).as_posix())
  photos.append(dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-27T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，照片水印核对至分钟',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 b=dict(id=ident,title=title,subtitle=sub,authors=[dict(name=n,country='美国' if i==101 else None,role='编著' if i==103 else '著') for n in author.split('、')],translators=[],publisher=publisher,isbn=isbn,category=category,tags=[category],usageTags=['文学阅读'] if category=='文学与小说' else ['资料参考'],language='zh-Hans',languageLabel='中文',series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes='书目与定价据实体封面、封底照片；版权页版次及印次未核实。',description=description,metadataSource='用户上传的实体书照片',photos=photos,condition=dict(label='有使用痕迹',note='封面、封底及边角可见使用痕迹，未逐页检查。',scope='外观',source='照片预估',assessedOn='2026-10-28'))
 if i==101:b.update(originalTitle='Necronomicon',titleAliases=['H. P. Lovecraft','克苏鲁'],notes=b['notes']+' 译者及绘者姓名待版权页核实。')
 if i==102:b['originalTitle']='Someone to Talk to'
 if i==105:b.update(publicationDate='2022-01',edition='2022年1月第1版；2022年8月第10次印刷',notes='护封已缺失，据补拍版权页核实ISBN、出版社与69.90元平装定价；保留正面、背面和版权页实拍。')
 if i==109:b['coverEditionLabel']='纪念版'
 if i==110:b.update(publicationDate='2014-12',edition='2014年12月第1版；2018年12月第60次印刷',notes='护封已缺失，据补拍版权页核实ISBN、出版社与39.80元定价；保留正面、背面和版权页实拍。')
 if i>=111:b.update(series='地球往事三部曲',seriesGroupId='three-body',seriesNumber=i-110,seriesLabel=f'第{i-110}部',titleAliases=['三体'+str(i-110),'地球往事'])
 d['books'].append(b)
d['seriesGroups'].append(dict(id='three-body',title='三体：地球往事三部曲',shortTitle='三体',kind='三部曲',description='三册各自独立ISBN及封底定价，分别建档；未推定为同次购买。'))
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
manifest=dict(newBooks=[b['id'] for b in d['books'][-13:]],originalPaths=paths,source='2026-10-27两批共28张唯一实拍照片，含2张版权页；新旧书目与照片查重后录入。')
(r/'docs/batch_20261027.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Imported 13 books and 28 originals; copyright pages retained separately')
