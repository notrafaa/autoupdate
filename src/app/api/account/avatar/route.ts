import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const BUCKET_NAME = 'avatars';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const username = formData.get('username') as string;
    const hwid = formData.get('hwid') as string;

    if (!file || !username || !hwid) {
      return NextResponse.json(
        { success: false, message: 'File, username and HWID are required.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Image size must be less than 2MB.' },
        { status: 400 }
      );
    }

    // Verify user exists and HWID matches (basic security)
    const { data: user, error: userError } = await supabase
      .from('user_accounts')
      .select('id, hwid')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    if (user.hwid && user.hwid !== hwid) {
       return NextResponse.json(
        { success: false, message: 'HWID mismatch.' },
        { status: 403 }
      );
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === BUCKET_NAME)) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_SIZE
      });
    }

    // Prepare filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      // If bucket doesn't exist, we might need to handle it or assume it's there
      return NextResponse.json(
        { success: false, message: 'Upload failed: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Update user_accounts table
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: 'Failed to update user profile: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar updated successfully.',
      avatar_url: publicUrl
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
