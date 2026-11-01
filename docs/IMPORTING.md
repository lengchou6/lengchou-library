# 藏书批次导入与发布

先整批核对完整书名、照片归属、ISBN、定价及版本来源；未展示信息留空。每个实体册保留编号，套装合价只计一次，重复照片按SHA256去重。内封、版权页等按实际类型标注。

## 增量上传与续传

导入后运行 `python scripts/prepare_uploads.py --batch BATCH --ids ID...`。读取 `.cache/imports/BATCH/plan.json`，仅上传本批原图。已核实的Git blob SHA可直接复用；成功上传后立即用 `--record-path PATH --sha RETURNED_SHA` 保存检查点。检查点按仓库隔离，中断后只续传未完成项。

大附件使用经SHA256校验的数据块，部署时无损还原。不裁切、旋转或重新编码接收附件。逐次上传仍有调用开销，不承诺固定耗时。上传和发布遵循用户授权；审核明确拒绝时先检查原因，不能把审批拒绝视为临时网络错误盲目重试。

## 校验、合并与验收

图片依赖使用 `requirements-images.txt` 固定版本，保持本地与CI一致，复用派生图缓存。运行原图还原、书目验证、重复项审计及现有图片恢复和套装回归检查。确认本地基线与GitHub主分支一致后，一批一次提交、PR、合并。

等待Actions部署成功，再运行 `python scripts/audit_deployed_batch.py --ids ID... --version VERSION --expected-records COUNT --output .cache/imports/BATCH/live.json`，检查新增原图、派生图和旧兼容地址。未通过就继续修复，不把合并等同于上线。最终报告新增完整书名、补充信息、实体册数和照片总数，以及网页链接。
