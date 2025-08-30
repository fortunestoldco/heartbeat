import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { reason, message, timestamp } = await request.json();

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Twilio credentials not configured');
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 503 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = process.env.EMERGENCY_CONTACT_PHONE;

    if (!fromNumber || !toNumber) {
      console.error('Emergency contact phone numbers not configured');
      return NextResponse.json(
        { error: 'Emergency contacts not configured' },
        { status: 503 }
      );
    }

    // Create Twilio client
    const client = require('twilio')(accountSid, authToken);

    const smsMessage = await client.messages.create({
      body: `🚨 FAILSAFE ALERT: ${message}`,
      from: fromNumber,
      to: toNumber
    });

    console.log(`Emergency SMS sent: ${smsMessage.sid}`);

    return NextResponse.json({
      success: true,
      messageSid: smsMessage.sid,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Emergency SMS failed:', error);
    return NextResponse.json(
      { error: 'Failed to send emergency SMS' },
      { status: 500 }
    );
  }
}