/**
 * Created by lixw on 2017/3/30.
 */

describe('unitest on employee', function () {
  describe('check employee validation', function () {
    // it('create employee with wrong gender', function (done) {
    //   superagent.post(serverUrl + 'Employees')
    //     .send(
    //       {
    //         "employee_number": "tst99999",
    //         "name": "tst",
    //         "first_name": "tst",
    //         "last_name": "tst",
    //         "gender": "error",
    //         "personal_mobile": "111111111",
    //         "work_email": "111@test.com",
    //         "birthdate": "1993-03-30",
    //         "marriage": "no",
    //         "education": "phd"
    //       }
    //     )
    //     .end(function (err, res) {
    //       expect(err.status).toEqual(422);
    //       //console.log("ERROR:%s",JSON.parse(res.text).error.details.messages.gender[0]);
    //       expect(JSON.parse(res.text).error.details.messages.gender[0]).toEqual('is not included in the list');
    //       done();
    //     });
    // });

    // it('create employee with wrong email', function (done) {
    //   superagent.post(serverUrl + 'Employees')
    //     .send(
    //       {
    //         "employee_number": "tst99998",
    //         "name": "tst1",
    //         "first_name": "tst1",
    //         "last_name": "tst1",
    //         "gender": "male",
    //         "personal_mobile": "111111111",
    //         "work_email": "error",
    //         "birthdate": "1993-03-30",
    //         "marriage": "no",
    //         "education": "phd"
    //       }
    //     )
    //     .end(function (err, res) {
    //       expect(err.status).toEqual(422);
    //       expect(JSON.parse(res.text).error.details.messages.work_email[0]).toEqual('is invalid');
    //       done();
    //     });
    // });

    it('create employee ', function (done) {
      superagent.post(serverUrl + 'Employees')
        .send(
          {
            "employee_number": "tst99997",
            "name": "tst2",
            "first_name": "tst2",
            "last_name": "tst2",
            "gender": "male",
            "personal_mobile": "111111111",
            "work_email": "test@test.com",
            "birthdate": "1993-03-30",
            "marriage": "no",
            "education": "phd"
          }
        )
        .end(function (err, res) {
          expect(err).toEqual(null);
          expect(res.status).toEqual(200);
          done();
        });
    });

  });
})
