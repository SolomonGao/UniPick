import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, X, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { API_ENDPOINTS } from '../lib/constants';
import { toast } from 'sonner';
import LocationPicker from './LocationPicker';
import { useAuth } from './AuthGuard';

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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemId, setItemId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  // 检查是否是编辑模式
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      setItemId(parseInt(editId));
      setIsEditMode(true);
      loadItemData(parseInt(editId));
    }
  }, []);

  // 加载商品数据
  const loadItemData = async (id: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.items}/${id}`);
      if (!response.ok) {
        throw new Error('加载商品数据失败');
      }
      const item = await response.json();
      
      // 填充表单
      setValue('title', item.title);
      setValue('price', item.price);
      setValue('description', item.description || '');
      setValue('category', item.category || '');
      setValue('location_name', item.location_name);
      setValue('latitude', item.latitude);
      setValue('longitude', item.longitude);
      
      // 设置现有图片
      if (item.images && item.images.length > 0) {
        setExistingImages(item.images);
      }
    } catch (error: any) {
      toast.error(error.message || '加载商品数据失败');
    } finally {
      setLoading(false);
    }
  };

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
      const totalImages = existingImages.length + images.length + acceptedFiles.length;
      if (totalImages > 4) {
        toast.error('最多只能上传4张图片');
        return;
      }
      setImages((prev) => [...prev, ...acceptedFiles].slice(0, 4 - existingImages.length));
    },
  });

  // 移除待上传图片
  const removeNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 移除已有图片
  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ItemFormInputs) => {
    const totalImages = existingImages.length + images.length;
    if (totalImages === 0) {
      toast.error("请至少上传一张图片");
      return;
    }

    const uploadedPaths: string[] = [];

    try {
      setUploading(true);
      const newImageUrls: string[] = [];

      // 1. 上传新图片到 Supabase Storage
      for (const file of images) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedPaths.push(filePath);

        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath);

        newImageUrls.push(publicUrl);
      }

      // 2. 获取当前 Session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("请先登录");
        window.location.href = "/login";
        return;
      }

      // 3. 合并图片：已有图片 + 新上传图片
      const allImages = [...existingImages, ...newImageUrls];

      const payload = {
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        location_name: data.location_name,
        images: allImages,
        latitude: data.latitude,
        longitude: data.longitude
      };

      // 4. 调用后端 API
      let response;
      if (isEditMode && itemId) {
        // 编辑模式：使用 PUT
        response = await fetch(`${API_ENDPOINTS.items}/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // 新增模式：使用 POST
        response = await fetch(API_ENDPOINTS.items + '/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || (isEditMode ? "更新失败" : "发布失败"));
      }

      toast.success(isEditMode ? "更新成功！" : "发布成功！");
      reset();
      setImages([]);
      setExistingImages([]);
      // 编辑模式返回我的发布，新增模式返回首页
      window.location.href = isEditMode ? "/my-listings" : "/";

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong");

      if (uploadedPaths.length > 0) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto py-8">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <a 
          href={isEditMode ? "/my-listings" : "/"} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isEditMode ? "返回我的发布" : "返回主页"}</span>
        </a>
        {isEditMode && (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
            编辑模式
          </span>
        )}
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-bold text-gray-900">
        {isEditMode ? '编辑商品' : '发布新商品'}
      </h1>

      {/* 图片上传区 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          商品图片 (最多4张，已有 {existingImages.length} 张)
        </label>
        
        {/* 已有图片预览 */}
        {existingImages.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                <img src={url} alt={`existing-${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 新图片上传 */}
        {existingImages.length + images.length < 4 && (
          <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors">
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isEditMode ? '点击或拖拽添加更多图片' : '点击或拖拽上传图片'}
            </p>
          </div>
        )}

        {/* 新图片预览 */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {images.map((file, index) => (
              <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
        {uploading 
          ? "正在上传图片..." 
          : isEditMode 
            ? "保存修改" 
            : "发布商品"
        }
      </button>
    </form>
  );
}
