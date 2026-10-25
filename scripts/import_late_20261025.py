"""Import seven physical books from fourteen unmodified full-frame photographs."""
import argparse,hashlib,json,shutil
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];path=root/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==71
# English and Italian copies are separate physical volumes of the same work.
rows=[
('The Art of Joy',None,'Goliarda Sapienza','意大利',['Anne Milano Appel'],'Penguin Classics','978-0-141-19847-7',14.99,'GBP','143111','143125','文学与小说','en','英文'),
("L’arte della gioia",None,'Goliarda Sapienza','意大利',[],'Einaudi','978-88-06-21967-3',16,'EUR','143141','143155','文学与小说','it','意大利文'),
('霍比特人',None,'J. R. R. 托尔金','英国',['邓嘉宛','石中歌','杜蕴慈'],'四川文艺出版社','978-7-5411-6938-0',79.8,'CNY','143215','143228','文学与小说','zh-Hans','中文'),
('金叶','来自金枝的故事','J. G. 弗雷泽','英国',['汪培基'],'四川人民出版社','978-7-220-11151-8',68,'CNY','143241','143254','人文与社科','zh-Hans','中文'),
('遥远的救世主',None,'豆豆',None,[],'作家出版社','978-7-5212-3633-0',60,'CNY','143313','143325','文学与小说','zh-Hans','中文'),
('背叛',None,'豆豆',None,[],'作家出版社','978-7-5212-3631-6',58,'CNY','143416','143429','文学与小说','zh-Hans','中文'),
('天幕红尘',None,'豆豆',None,[],'作家出版社','978-7-5212-3656-9',58,'CNY','143455','143506','文学与小说','zh-Hans','中文')]
paths=[]
for i,(title,sub,author,country,trans,publisher,isbn,price,currency,front,back,category,lang,label) in enumerate(rows,72):
 ident=f'LC-{i:06}';photos=[]
 for stamp,side,side_label in [(front,'front','正面'),(back,'back','背面')]:
  src=a.source/f'IMG_20261025_{stamp}.jpg';dest=root/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
  with Image.open(src) as img:w,h=img.size
  rel=dest.relative_to(root/'dist').as_posix();paths.append(dest.relative_to(root).as_posix())
  photos.append(dict(side=side,label=side_label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，照片水印核对至分钟；未据文件修改时间推定拍摄时间',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 condition='封面、封底及边角可见轻微使用痕迹；未检查内页和装订。'
 if i==73:condition='封底左上部有明显长折痕，边缘有磨损。'
 if i==75:condition='护封上缘、下角和背面可见折痕、擦痕及磨损。'
 b=dict(id=ident,title=title,subtitle=sub,authors=[dict(name=author,country=country,role='著')],translators=trans,publisher=publisher,isbn=isbn,category=category,tags=['小说'] if category=='文学与小说' else ['神话','民俗'],usageTags=['文学阅读'] if category=='文学与小说' else ['资料参考'],language=lang,languageLabel=label,series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency=currency,purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes='书目与定价据实体正反面照片，版次、印次未知；保留完整原始照片。',description=None,metadataSource='用户上传的实体书封面和封底照片',photos=photos,condition=dict(label='有明显磨损' if i in [73,75] else '有使用痕迹',note=condition,scope='外观',source='照片预估',assessedOn='2026-10-25'))
 if i in [72,73]:
  b.update(referenceTitle='欢愉的艺术',originalTitle="L’arte della gioia",titleAliases=['欢愉的艺术','快乐的艺术','The Art of Joy',"L'arte della gioia"],series='Penguin Modern Classics' if i==72 else 'Super ET',seriesGroupId='art-of-joy-editions',seriesNumber=i-71,seriesLabel='英文版' if i==72 else '意大利文版',description='以莫德斯塔在二十世纪西西里的成长与生活为线索，描写她对自由、欲望与个人命运的追求。')
  b['notes']+=' 中文参考名“欢愉的艺术”为辅助检索用译名，不表示拥有中文译本。两册为同一作品的不同语种版本，不视作重复实体册。'
  if i==72:
   b.update(publicationDate='2014-03-06',referenceSources=[dict(label='Penguin：本版书名、译者与出版资料',url='https://www.penguin.co.uk/books/183043/the-art-of-joy-by-sapienza-goliarda/9780141198477')],coverPrices=[dict(currency='GBP',amount=14.99,region='英国'),dict(currency='CAD',amount=31.99,region='加拿大')])
   b['notes']+=' 封底同时标示英国£14.99与加拿大$31.99；主定价采用英国GBP，未将两地价格重复累计。'
  else:b['referenceSources']=[dict(label='意大利天主教圣心大学书店：本版ISBN与出版社',url='https://librerie.unicatt.it/scheda-libro/goliarda-sapienza/larte-della-gioia-9788806219673-210778.html')]
 if i==74:b.update(originalTitle='The Hobbit',description='比尔博·巴金斯离开家园，与矮人同行前往孤山，经历冒险并面对恶龙史矛革。')
 if i==75:
  b['authors'].append(dict(name='丽莉·弗雷泽',country='英国',role='编'));b.update(originalTitle='Leaves From the Golden Bough',description='由丽莉·弗雷泽从《金枝》中编选改写的神话与民俗故事集；此册为汪培基译本。')
 if i==76:b['description']='丁元英隐居古城后与芮小丹相遇，一场围绕扶贫、商业与文化观念的社会实验展开。'
 if i==77:b.update(description='记者夏英杰与宋一坤相识后卷入复杂的商业局面，人物在利益、爱情与道义之间作出选择。',notes=b['notes']+' 封面另有“世纪之交的灵魂忏悔录”宣传语，不将其推定为正式副书名。')
 if i==78:b['description']='叶子农在苏联解体后的国际与商业风云中坚持自己的思考与选择，故事围绕观念、利益和人的命运展开。'
 d['books'].append(b)
d['seriesGroups'].append(dict(id='art-of-joy-editions',title='欢愉的艺术 · 不同语种版本',shortTitle='欢愉的艺术',kind='不同语种版本',description='同一作品的英文译本与意大利文原文版，各册独立编号、ISBN与定价，不推定为购买套装。'))
d['exchangeRates']['rates']['EUR']=7.5228
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(root/'docs/batch_20261025_1431.json').write_text(json.dumps(dict(books=[b['id'] for b in d['books'][-7:]],originalPaths=paths,source='2026-10-25 14:31—14:35 用户上传14张正反面照片',euroRateSource='https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do',euroRateDate='2026-10-16'),ensure_ascii=False,indent=2)+'\n')
Path('/workspace/scratch/d7434e3573fb/batch25late-paths.json').write_text(json.dumps(paths));print('Imported 7 books / 14 originals')
