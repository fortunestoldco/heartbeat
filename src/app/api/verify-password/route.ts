import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/crypto';

const MASTER_PASSWORD_HASH = process.env.MASTER_PASSWORD_HASH || 'default-hash';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const isValid = verifyPassword(password, MASTER_PASSWORD_HASH);
    
    return NextResponse.json({ 
      valid: isValid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Password verification failed:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}