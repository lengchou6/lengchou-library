from pathlib import Path
import json,hashlib,shutil
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
R=Path(__file__).resolve().parents[1]; src=args.source;p=R/'dist/data/books.json';d=json.loads(p.read_text())
d['schemaVersion']=3
d['exchangeRates']={'base':'CNY','date':'2026-10-16','source':'国家外汇管理局·人民币汇率中间价','sourceUrl':'https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do','rates':{'CNY':1,'USD':6.7220,'GBP':8.9037},'policy':'按最近公布中间价固定折算，手动更新；非实际购书支出。'}
d['seriesGroups']=[g for g in d['seriesGroups'] if g['id']!='dnd-revised-core']+[{'id':'dnd-revised-core','title':'D&D 5.5e · 核心规则书','shortTitle':'D&D 5.5e 核心规则书','kind':'核心规则书归组','description':'第五版修订规则，三册于 2024—2025 年出版；每册独立编目，不代表同一购买套装。'}]
items=[
('社会心理学',None,None,'zh-Hans','中文译本','978-7-115-41004-7',128,'CNY','183034(1)','183110(1)','心理学与社会',[{'name':'戴维·迈尔斯','originalName':'David G. Myers','country':'美国'}],['侯玉波','乐国安','张智勇'],'人民邮电出版社','第11版','约八成新','封面与封底边角有磨损，封底下沿及书角有折压。'),
('Pulp Fiction',None,'低俗小说','en','英语','978-0-571-20068-9',9.99,'GBP','185519(1)','185539(1)','写作与叙事',[{'name':'Quentin Tarantino'}],[],'Faber & Faber',None,'约八成新','封面有细划痕及折痕，封底边缘和书角有使用痕迹。'),
('通关！','游戏设计之道',None,'zh-Hans','中文译本','978-7-115-43177-6',99,'CNY','190326','190340','游戏设计与研发',[{'name':'Scott Rogers','country':'美国'}],['孙懿','高济润'],'人民邮电出版社','第2版','约八成新','封面左侧及书脊附近有折痕，封底边缘有磨损与折压。'),
('Player’s Handbook',None,'玩家手册','en','英语','978-0-7869-6951-7',49.99,'USD','190437','190503','桌面角色扮演',[{'name':'编著者待版权页核对'}],[],'Wizards of the Coast',None,'约八五成新','封面与封底整体完整，边缘、书脊附近有轻微磨损。'),
('Monster Manual',None,'怪物图鉴','en','英语','978-0-7869-6954-8',49.99,'USD','190529','190541','桌面角色扮演',[{'name':'编著者待版权页核对'}],[],'Wizards of the Coast',None,'约八成新','封面右下角及封底下方书角可见较明显折压、磨损。'),
('Dungeon Master’s Guide',None,'地下城主指南','en','英语','978-0-7869-6952-4',49.99,'USD','190559','190610','桌面角色扮演',[{'name':'编著者待版权页核对'}],[],'Wizards of the Coast',None,'约八五成新','封面与封底整体完整，边角有轻微磨损与折压。')]
d['books']=[b for b in d['books'] if not 14<=int(b['id'].split('-')[1])<=19]
for n,x in enumerate(items,14):
 title,subtitle,cn,lang,ll,isbn,price,curr,front,back,category,authors,trans,publisher,edition,condition,note=x
 ident=f'LC-{n:06}';dest=R/'dist/assets'/ident;dest.mkdir(parents=True,exist_ok=True);photos=[]
 for side,suffix in [('front',front),('back',back)]:
  filename=f'IMG_20261018_{suffix}.jpg';raw=(src/filename).read_bytes();out=dest/f'{side}-original.jpg';out.write_bytes(raw);time=suffix[:6];ts=f'2026-10-18T{time[:2]}:{time[2:4]}:{time[4:6]}+08:00';path=f'assets/{ident}/{out.name}'
  photos.append({'side':side,'label':'正面' if side=='front' else '背面','file':path,'original':path,'sourceFilename':filename,'capturedAt':ts,'timeSource':'文件名；照片水印核对至分钟','sha256':hashlib.sha256(raw).hexdigest()})
 b={'id':ident,'title':title,'subtitle':subtitle,'referenceTitle':cn,'language':lang,'languageLabel':ll,'authors':authors,'translators':trans,'publisher':publisher,'isbn':isbn,'category':category,'tags':(['D&D','龙与地下城','核心规则'] if n>=17 else ['社会心理学'] if n==14 else ['电影剧本'] if n==15 else ['游戏设计']),'series':None,'seriesGroupId':None,'seriesNumber':None,'seriesLabel':None,'purchaseGroupId':None,'orientation':'portrait','coverEditionLabel':edition,'publicationDate':None,'edition':None,'listPrice':price,'paidPrice':None,'currency':curr,'purchaseDate':None,'purchaseDatePrecision':None,'purchaseChannel':None,'accessionedAt':photos[0]['capturedAt'],'accessionRule':'首张正面照片的拍摄时间','readingStatus':None,'location':None,'notes':None,'description':('D&D 修订核心规则书，英语版；个人编著者及具体印次待版权页核对。' if n>=17 else '电影《低俗小说》的英文剧本。' if n==15 else '书名、作者及定价依据自有实体书封面、封底录入。'),'metadataSource':'自有实体书正反面照片；语种与中文参考名为编目辅助信息','photos':photos,'condition':{'label':condition,'note':note,'scope':'外观','source':'正反面照片预估','assessedOn':'2026-10-18','limitations':'未检查内页、装订牢固度、缺页、笔记及霉斑等情况。'}}
 if n>=17:
  num={17:1,18:3,19:2}[n];b.update(series='D&D 5.5e · 核心规则书',seriesGroupId='dnd-revised-core',seriesNumber=num,seriesLabel={1:'玩家规则',2:'主持人指南',3:'怪物资料'}[num])
 if n>=17:
  b.update(rulesVersion='5.5e',rulesVersionLabel='5.5e（2024 修订规则）',publicationVersion='2025 修订版' if n==18 else '2024 修订版',printing=None)
  b['tags']+=['英语','5.5e',b['publicationVersion']]
 if n==14:b['originalTitle']='Social Psychology'
 if n==16:b['originalTitle']='Level Up! The Guide to Great Video Game Design'
 if n==15:b['bibliographySourceUrl']='https://www.faber.co.uk/product/9780571200689-pulp-fiction/'
 d['books'].append(b)
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
