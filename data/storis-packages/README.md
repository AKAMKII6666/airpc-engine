# storis-packages

正式故事包根。探针包 id 须用测试分配的随机前缀，**不要**手写固定 `pkg_test_*` 落在本目录并由 root 创建。

若出现属主为 `root`、本机用户无法删除的残留目录（历史上曾有 `pkg_test_1`），请本机执行：

```bash
sudo rm -rf data/storis-packages/<packageId>
```

列表扫描会对迁移写盘的 `EACCES` 跳过该包，避免整表失败；残留仍占盘且可能干扰手工操作。
