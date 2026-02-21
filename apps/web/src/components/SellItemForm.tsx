import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { Loader2, Upload, X, ArrowLeft, Trash2, Camera, Tag, DollarSign, FileText, MapPin } from 'lucide-react';
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

// 表单校验
const itemSchema = z.object({
  title: z.string().min(2, "标题至少 2 个字"),
  price: z.number().min(0.01, "价格不能为 0"),
  description: z.string().optional(),
  category: z.string().min(1, "请选择分类"),
  location_name: z.string().min(2, "请选择交易地点"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  is_location_private: z.boolean(),
});

type ItemFormInputs = z.infer<typeof itemSchema>;

export default function SellItemForm() {
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemId, setItemId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const form = useForm<ItemFormInputs>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      latitude: 37.2294,
      longitude: -80.4139,
      location_name: '',
      is_location_private: false
    }
  });

  const {
    register,
    handleSubmit: formHandleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = form;

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
      if (!response.ok) throw new Error('加载商品数据失败');
      const item = await response.json();
      
      setValue('title', item.title);
      setValue('price', item.price);
      setValue('description', item.description || '');
      setValue('category', item.category || '');
      setValue('location_name', item.location_name);
      setValue('latitude', item.latitude);
      setValue('longitude', item.longitude);
      
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
  const handleLocationChange = (lat: number, lng: number, name: string, isPrivate?: boolean) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
    setValue('location_name', name);
    setValue('is_location_private', isPrivate || false);
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

  const removeNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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

      // 上传新图片
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("请先登录");
        window.location.href = "/login";
        return;
      }

      const allImages = [...existingImages, ...newImageUrls];

      const payload = {
        title: data.title,
        price: data.price,
        description: data.description,
        category: data.category,
        location_name: data.location_name,
        images: allImages,
        latitude: data.latitude,
        longitude: data.longitude,
        is_location_private: data.is_location_private
      };

      let response;
      if (isEditMode && itemId) {
        response = await fetch(`${API_ENDPOINTS.items}/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
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
        let errorMessage = isEditMode ? "更新失败" : "发布失败";
        try {
          const errData = await response.json();
          errorMessage = typeof errData.detail === 'string' ? errData.detail : errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast.success(isEditMode ? "更新成功！" : "发布成功！");
      reset();
      setImages([]);
      setExistingImages([]);
      window.location.href = isEditMode ? "/my-listings" : "/";

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "操作失败");

      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage.from('item-images').remove(uploadedPaths);
        } catch (cleanupError) {
          console.error("清理上传图片失败:", cleanupError);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <a 
        href={isEditMode ? "/my-listings" : "/"} 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-8"
      >
        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-gray-900 dark:hover:border-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-medium">{isEditMode ? "返回我的发布" : "返回主页"}</span>
      </a>

      {/* 标题区 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isEditMode ? '编辑商品' : '发布新商品'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {isEditMode ? '更新商品信息，吸引更多买家' : '填写商品信息，快速出售闲置物品'}
        </p>
        {isEditMode && (
          <span className="inline-block mt-3 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
            编辑模式
          </span>
        )}
      </div>

      <form onSubmit={formHandleSubmit(onSubmit)} className="space-y-8">
        {/* 图片上传区 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Camera className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">商品图片</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">最多上传 4 张，已有 {existingImages.length} 张</p>
            </div>
          </div>
          
          {/* 已有图片预览 */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              {existingImages.map((url, index) => (
                <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img src={url} alt={`existing-${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-gray-900/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 新图片上传 */}
          {existingImages.length + images.length < 4 && (
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/50">
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
                点击或拖拽上传图片
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                支持 JPG、PNG 格式
              </p>
            </div>
          )}

          {/* 新图片预览 */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-4">
              {images.map((file, index) => (
                <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-gray-900/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Tag className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">基本信息</h2>
          </div>

          <div className="space-y-5">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">商品标题</label>
              <input 
                {...register('title')} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                placeholder="例如：99新 Switch OLED"
              />
              {errors.title && <p className="mt-1.5 text-red-500 text-sm">{errors.title.message}</p>}
            </div>

            {/* 价格和分类 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    价格
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
                {errors.price && <p className="mt-1.5 text-red-500 text-sm">{errors.price.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分类</label>
                <select
                  {...register('category')}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white transition-all"
                >
                  <option value="">选择分类</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1.5 text-red-500 text-sm">{errors.category.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* 商品描述 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">商品描述</h2>
          </div>
          
          <textarea 
            {...register('description')} 
            rows={5}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all"
            placeholder="描述一下商品成色、功能状态、交易方式等..."
          />
        </div>

        {/* 交易地点 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">交易地点</h2>
          </div>
          
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
          {errors.location_name && <p className="mt-2 text-red-500 text-sm">{errors.location_name.message}</p>}
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="w-full h-14 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-gray-200 dark:shadow-gray-800"
        >
          {(isSubmitting || uploading) ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {uploading ? '上传图片中...' : '保存中...'}
            </>
          ) : (
            <>
              {isEditMode ? '保存修改' : '发布商品'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
