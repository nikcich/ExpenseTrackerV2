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

pub struct Response<T> {
    status: Status,
    message: T,
}

impl<T> Response<T> {
    pub fn new(status: Status, message: T) -> Self {
        Response { status, message }
    }
}

impl<T> Serialize for Response<T>
where
    T: Serialize,
{
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut s = serializer.serialize_struct("Response", 2)?;
        s.serialize_field("status", &self.status)?;
        s.serialize_field("message", &self.message)?;
        s.end()
    }
}
