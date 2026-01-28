'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileIcon, HardDrive, Folder } from 'lucide-react';
import useStore from '@/store/useStore';

export default function StorageStats() {
  const files = useStore((state) => state.files);

  // 计算统计数据
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const completedFiles = files.filter((file) => file.status === 'completed').length;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const stats = [
    {
      title: '总文件数',
      value: totalFiles,
      icon: FileIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: '已完成',
      value: completedFiles,
      icon: HardDrive,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: '总存储空间',
      value: formatFileSize(totalSize),
      icon: Folder,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
