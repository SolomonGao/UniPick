import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { API_ENDPOINTS } from '../lib/constants';
import { toast } from 'sonner';
import LocationPicker from './LocationPicker';

// 商品分类选项
const CATEGORIES = [
  { value: 'electronics', label: '电子产品' },
  { value: 'furniture', label: '家具' },
  { value: 'books', label: '书籍' },
  { value: 'clothing', label: '服装' },
  { value: 'sports', label: '运动' },
  { value: 'others', label: '其他' },
];

// 1. 定义表单校验
const itemSchema = z.object({
  title: z.string().min(2, "标题至少 2 个字"),
  price: z.number().min(0.01, "价格不能为 0"),
  description: z.string().optional(),
  category: z.string().min(1, "请选择分类"),
  location_name: z.string().min(2, "请选择交易地点"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type ItemFormInputs = z.infer<typeof itemSchema>;

export default function SellItemForm() {
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<ItemFormInputs>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      latitude: 37.2294,
      longitude: -80.4139,
      location_name: ''
    }
  });

  // 监听位置变化
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const locationName = watch('location_name');

  // 处理位置变化
  const handleLocationChange = (lat: number, lng: number, name: string) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
    setValue('location_name', name);
  };

  // 处理图片拖拽
  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 4,
    onDrop: (acceptedFiles) => {
      setImages((prev) => [...prev, ...acceptedFiles].slice(0, 4));
    },
  });

  // 移除待上传图片
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ItemFormInputs) => {
    if (images.length === 0) {
      toast.error("请至少上传一张图片");
      return;
    }

    const uploadedPaths: string[] = [];

    try {
      setUploading(true);
      const imageUrls: string[] = [];

      // 1. 逐个上传图片到 Supabase Storage
      for (const file of images) {
        // 生成唯一文件名: user_id/timestamp_random.jpg
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`; // 简单起见直接放在根目录，或者你可以加 userId 前缀

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedPaths.push(filePath);

        // 获取 Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      // 2. 准备发给后端的数据
      // 获取当前 Session 用于 Header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("请先登录");
        window.location.href = "/login";
        return;
      }

      const payload = {
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        location_name: data.location_name,
        images: imageUrls,
        latitude: data.latitude,
        longitude: data.longitude
      };

      // 3. 调用 FastAPI 后端
      const response = await fetch(API_ENDPOINTS.items + '/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // 👈 关键：带上 JWT
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "发布失败");
      }

      toast.success("发布成功！");
      reset();
      setImages([]);
      // 跳转回首页或详情页
      window.location.href = "/";

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");

      if (uploadedPaths.length > 0) {
        // 清理已上传但发布失败的图片
        try {
          await supabase.storage
            .from('item-images')
            .remove(uploadedPaths);
        } catch (cleanupError) {
          console.error("Failed to clean up uploaded images:", cleanupError);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto py-8">

      {/* 图片上传区 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">商品图片 (最多4张)</label>
        <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors">
          <input {...getInputProps()} />
          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">点击或拖拽上传图片</p>
        </div>

        {/* 图片预览 */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {images.map((file, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 标题 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">标题</label>
        <input {...register('title')} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="例如：99新 Switch OLED" />
        {errors.title && <p className="text-red-500 text-xs">{errors.title.message}</p>}
      </div>

      {/* 价格 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">价格 ($)</label>
        <input
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          placeholder="0.00"
        />
        {errors.price && <p className="text-red-500 text-xs">{errors.price.message}</p>}
      </div>

      {/* 分类 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">分类</label>
        <select
          {...register('category')}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
        >
          <option value="">请选择分类</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs">{errors.category.message}</p>}
      </div>

      {/* 描述 */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">描述</label>
        <textarea {...register('description')} rows={4} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="描述一下成色、交易方式..." />
      </div>

      {/* 位置选择器 */}
      <div className="space-y-1">
        <Controller
          name="location_name"
          control={control}
          render={({ field }) => (
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              locationName={field.value || locationName}
              onChange={handleLocationChange}
            />
          )}
        />
        {errors.location_name && <p className="text-red-500 text-xs">{errors.location_name.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center gap-2"
      >
        {(isSubmitting || uploading) && <Loader2 className="animate-spin" />}
        {uploading ? "正在上传图片..." : "发布商品"}
      </button>
    </form>
  );
}
