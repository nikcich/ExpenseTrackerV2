use serde::ser::{SerializeStruct, Serializer};
use serde::Serialize;

#[repr(u16)]
#[derive(Copy, Clone)]
pub enum Status {
    Ok = 200,
    Created = 201,
    Accepted = 202,
    Found = 302,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    MethodNotAllowed = 405,
    RequestTimeout = 408,
    Conflict = 409,
    Error = 500,
    InsufficientStorage = 507,
}

impl Serialize for Status {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u16(*self as u16)
    }
}

pub struct Response {
    status: Status,
    header: String,
    message: serde_json::Value,
}

impl Response {
    pub fn new<T>(status: Status, header: String, message: T) -> Self
    where
        T: Serialize,
    {
        Response {
            status,
            header,
            message: serde_json::to_value(message)
                .expect("serialization to serde_json::Value failed"),
        }
    }

    // Explicit constructor specifically for serde_json::Value to avoid duplication of to_value
    // Usually used for Stores or any form of data that already uses serde_json::Value
    pub fn serde_value(status: Status, header: String, message: serde_json::Value) -> Self {
        Response {
            status,
            header,
            message,
        }
    }

    pub fn ok<T>(header: String, message: T) -> Self
    where
        T: Serialize,
    {
        Self::new(Status::Ok, header, message)
    }

    pub fn err<T>(header: String, message: T) -> Self
    where
        T: Serialize,
    {
        Self::new(Status::Error, header, message)
    }
}

impl Serialize for Response {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut s = serializer.serialize_struct("Response", 3)?;
        s.serialize_field("status", &self.status)?;
        s.serialize_field("header", &self.header)?;
        s.serialize_field("message", &self.message)?;
        s.end()
    }
}
