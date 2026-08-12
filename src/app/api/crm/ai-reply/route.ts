import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: Request) {

  try {

    const body = await req.json();

    const {
      phone,
      reply,
      timestamp
    } = body;


    if(!phone || !reply){
      return NextResponse.json(
        {
          error:"Missing phone or reply"
        },
        {
          status:400
        }
      );
    }


    // Find contact
    const {data:contact,error:contactError} =
    await supabase
    .from("contacts")
    .select("id")
    .eq("phone",phone)
    .single();



    if(contactError || !contact){

      return NextResponse.json(
        {
          error:"Contact not found"
        },
        {
          status:404
        }
      );

    }

    // Find conversation

    const {data:conversation,error:conversationError}
    =
    await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id",contact.id)
    .single();



    if(conversationError || !conversation){

      return NextResponse.json(
        {
          error:"Conversation not found"
        },
        {
          status:404
        }
      );

    }

    // Save AI Reply

    const {error:messageError}
    =
    await supabase
    .from("messages")
    .insert({

      conversation_id:conversation.id,

      sender_type:"agent",

      content_type:"text",

      content_text:reply,

      status:"sent",

      created_at:
      timestamp || new Date().toISOString()

    });



    if(messageError){

      throw messageError;

    }



    return NextResponse.json({

      success:true,

      message:"AI reply saved"

    });



  }catch(error:any){

    return NextResponse.json(
      {
        error:error.message
      },
      {
        status:500
      }
    );

  }

}